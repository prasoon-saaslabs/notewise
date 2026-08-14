use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

static DEV_GATEWAY: Mutex<Option<Child>> = Mutex::new(None);
static SIDECAR_GATEWAY: Mutex<Option<CommandChild>> = Mutex::new(None);
static LAST_SPAWN_ERROR: Mutex<Option<String>> = Mutex::new(None);
static UPLOAD_TEMPS: Mutex<Option<HashMap<String, PathBuf>>> = Mutex::new(None);

const GATEWAY_PORT: u16 = 3002;
const HEALTH_PATH: &str = "/health";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GatewayDiagnostics {
    pub running: bool,
    pub reachable: bool,
    pub has_api_key: bool,
    pub status: String,
    pub worker: String,
    pub port: u16,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct GatewayFetchResult {
    status: u16,
    body: String,
}

fn gateway_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?
        .join("data");
    fs::create_dir_all(&dir).map_err(|e| format!("create data dir: {e}"))?;
    Ok(dir)
}

fn gateway_log_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(gateway_data_dir(app)?.join("gateway.log"))
}

fn append_gateway_log(app: &AppHandle, line: &str) {
    if let Ok(path) = gateway_log_path(app) {
        let _ = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .and_then(|mut f| writeln!(f, "{line}"));
    }
}

fn upsert_env(vars: &mut Vec<(String, String)>, key: &str, value: &str) {
    if let Some(existing) = vars.iter_mut().find(|(k, _)| k == key) {
        existing.1 = value.to_string();
    } else {
        vars.push((key.to_string(), value.to_string()));
    }
}

fn env_value<'a>(vars: &'a [(String, String)], key: &str) -> Option<&'a str> {
    vars.iter()
        .find(|(k, v)| k == key && !v.is_empty())
        .map(|(_, v)| v.as_str())
}

fn random_hex_secret() -> String {
    use std::io::Read;
    let mut buf = [0u8; 32];
    if let Ok(mut f) = fs::File::open("/dev/urandom") {
        let _ = f.read_exact(&mut buf);
    }
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn write_gateway_env(app: &AppHandle, pyai_api_key: &str) -> Result<(), String> {
    let key = pyai_api_key.trim();
    if key.is_empty() {
        return Err("API key cannot be empty".into());
    }
    if key.len() > 512 {
        return Err("API key is too long".into());
    }
    let dir = gateway_data_dir(app)?;
    let path = dir.join("gateway.env");
    let mut vars = read_env_file(&path);
    upsert_env(&mut vars, "PYAI_API_KEY", key);
    if env_value(&vars, "AUTH_JWT_SECRET").is_none() {
        upsert_env(&mut vars, "AUTH_JWT_SECRET", &random_hex_secret());
    }
    let mut f = fs::File::create(&path).map_err(|e| format!("write gateway.env: {e}"))?;
    for (k, v) in &vars {
        writeln!(f, "{k}={v}").map_err(|e| format!("write gateway.env: {e}"))?;
    }
    Ok(())
}

fn read_env_file(path: &std::path::Path) -> Vec<(String, String)> {
    let Ok(content) = fs::read_to_string(path) else {
        return Vec::new();
    };
    content
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            let (key, value) = line.split_once('=')?;
            Some((key.trim().to_string(), value.trim().to_string()))
        })
        .collect()
}

fn read_gateway_env_vars(app: &AppHandle) -> Vec<(String, String)> {
    let Ok(dir) = gateway_data_dir(app) else {
        return Vec::new();
    };
    read_env_file(&dir.join("gateway.env"))
}

fn bundled_oauth_env(app: &AppHandle) -> Vec<(String, String)> {
    let Some(root) = bundled_gateway_root(app) else {
        return Vec::new();
    };
    read_env_file(&root.join("oauth.env"))
}

fn merged_gateway_env(app: &AppHandle) -> Vec<(String, String)> {
    let mut merged = Vec::new();
    #[cfg(debug_assertions)]
    if let Some(gw_root) = dev_gateway_root() {
        merged.extend(read_env_file(&gw_root.join(".env")));
    }
    merged.extend(bundled_oauth_env(app));
    merged.extend(read_gateway_env_vars(app));
    merged
}

fn env_has_pyai_key(vars: &[(String, String)]) -> bool {
    vars.iter()
        .any(|(k, v)| k == "PYAI_API_KEY" && !v.is_empty())
}

fn gateway_has_api_key(app: &AppHandle) -> bool {
    if env_has_pyai_key(&read_gateway_env_vars(app)) {
        return true;
    }
    #[cfg(debug_assertions)]
    {
        if let Some(gw_root) = dev_gateway_root() {
            if env_has_pyai_key(&read_env_file(&gw_root.join(".env"))) {
                return true;
            }
        }
    }
    false
}

fn dev_gateway_root() -> Option<PathBuf> {
    if let Ok(root) = std::env::var("NOTEWISE_REPO_ROOT") {
        let candidate = PathBuf::from(&root).join("services/pyai-gateway");
        if candidate.join(".venv").exists() {
            return Some(candidate);
        }
    }
    let mut dir = std::env::current_dir().ok()?;
    for _ in 0..8 {
        let candidate = dir.join("services/pyai-gateway");
        if candidate.join(".venv").exists() {
            return Some(candidate);
        }
        if !dir.pop() {
            break;
        }
    }
    None
}

fn bundled_gateway_root(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    [
        resource_dir.join("pyai-gateway"),
        resource_dir.join("resources/pyai-gateway"),
    ]
    .into_iter()
    .find(|p| p.join("app").is_dir())
}

fn sidecar_is_running() -> bool {
    SIDECAR_GATEWAY.lock().unwrap().is_some() || DEV_GATEWAY.lock().unwrap().is_some()
}

fn curl_health_raw() -> Option<String> {
    let url = format!("http://127.0.0.1:{GATEWAY_PORT}{HEALTH_PATH}");
    let output = std::process::Command::new("/usr/bin/curl")
        .args(["-sf", &url])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

fn parse_health(body: &str) -> (String, String) {
    let status = extract_json_string(body, "status").unwrap_or_else(|| "unknown".into());
    let worker = extract_json_string(body, "worker").unwrap_or_default();
    (status, worker)
}

fn extract_json_string(json: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{key}\":");
    let start = json.find(&pattern)? + pattern.len();
    let rest = json[start..].trim_start();
    if rest.starts_with('"') {
        let end = rest[1..].find('"')? + 1;
        return Some(rest[1..end].to_string());
    }
    None
}

pub fn gateway_diagnostics_for(app: &AppHandle) -> GatewayDiagnostics {
    let has_api_key = gateway_has_api_key(app);
    let running = sidecar_is_running();
    let spawn_err = LAST_SPAWN_ERROR.lock().unwrap().clone();

    if let Some(body) = curl_health_raw() {
        let (status, worker) = parse_health(&body);
        return GatewayDiagnostics {
            running: running || status != "unknown",
            reachable: true,
            has_api_key,
            status,
            worker,
            port: GATEWAY_PORT,
            error: spawn_err,
        };
    }

    GatewayDiagnostics {
        running,
        reachable: false,
        has_api_key,
        status: "down".into(),
        worker: String::new(),
        port: GATEWAY_PORT,
        error: spawn_err.or_else(|| {
            Some("Gateway not responding on 127.0.0.1:3002".into())
        }),
    }
}

fn free_gateway_port(app: &AppHandle) {
    let Ok(output) = std::process::Command::new("/usr/sbin/lsof")
        .args(["-ti", &format!("tcp:{GATEWAY_PORT}")])
        .output()
    else {
        return;
    };
    let pids = String::from_utf8_lossy(&output.stdout);
    if !pids.trim().is_empty() {
        append_gateway_log(app, &format!("free port {GATEWAY_PORT}: pids={pids}"));
    }
    for pid in pids.split_whitespace() {
        let _ = std::process::Command::new("/bin/kill")
            .arg(pid)
            .status();
    }
    std::thread::sleep(Duration::from_millis(500));
}

#[cfg(debug_assertions)]
fn spawn_dev_gateway(app: &AppHandle) -> Result<(), String> {
    let gw_root = dev_gateway_root().ok_or_else(|| {
        "Dev gateway not found. Run `make setup` in the notewise repo.".to_string()
    })?;
    let py = gw_root.join(".venv/bin/python");
    if !py.exists() {
        return Err(format!("Missing venv at {}", py.display()));
    }
    let data_dir = gateway_data_dir(app)?;
    let mut cmd = std::process::Command::new(py);
    cmd.current_dir(&gw_root)
        .env("NOTEWISE_PYAI_DATA_DIR", &data_dir)
        .env("NOTEWISE_DESKTOP_GATEWAY", "1")
        .env("PYAI_GATEWAY_PORT", GATEWAY_PORT.to_string())
        .env("PYAI_GATEWAY_HOST", "127.0.0.1");
    for (key, value) in merged_gateway_env(app) {
        cmd.env(key, value);
    }
    let child = cmd
        .args([
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            &GATEWAY_PORT.to_string(),
            "--log-level",
            "info",
            "--no-access-log",
        ])
        .spawn()
        .map_err(|e| format!("spawn dev gateway: {e}"))?;
    *DEV_GATEWAY.lock().unwrap() = Some(child);
    append_gateway_log(app, "dev gateway spawned");
    Ok(())
}

fn spawn_bundled_gateway(app: &AppHandle) -> Result<(), String> {
    let data_dir = gateway_data_dir(app)?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource dir: {e}"))?;
    let gw_root = bundled_gateway_root(app).ok_or_else(|| {
        format!(
            "gateway bundle missing under {} (expected pyai-gateway or resources/pyai-gateway)",
            resource_dir.display()
        )
    })?;
    let log_path = gateway_log_path(app)?;

    append_gateway_log(
        app,
        &format!(
            "spawn bundled gateway gw_root={} data_dir={}",
            gw_root.display(),
            data_dir.display()
        ),
    );

    let sidecar = app
        .shell()
        .sidecar("notewise-gateway")
        .map_err(|e| format!("sidecar not bundled: {e}"))?;

    let mut command = sidecar
        .env("NOTEWISE_RESOURCE_DIR", &resource_dir)
        .env("NOTEWISE_GATEWAY_ROOT", &gw_root)
        .env("NOTEWISE_GATEWAY_LOG", &log_path)
        .env("NOTEWISE_PYAI_DATA_DIR", &data_dir)
        .env("NOTEWISE_DESKTOP_GATEWAY", "1")
        .env("PYAI_GATEWAY_PORT", GATEWAY_PORT.to_string())
        .env("PYAI_GATEWAY_HOST", "127.0.0.1");

    for (key, value) in merged_gateway_env(app) {
        command = command.env(key, value);
    }

    let (_rx, child) = command
        .spawn()
        .map_err(|e| format!("spawn sidecar: {e}"))?;

    *SIDECAR_GATEWAY.lock().unwrap() = Some(child);
    append_gateway_log(app, "bundled gateway sidecar spawned");
    Ok(())
}

fn wait_for_reachable(app: &AppHandle, timeout: Duration) -> Result<GatewayDiagnostics, String> {
    let start = Instant::now();
    while start.elapsed() < timeout {
        let diag = gateway_diagnostics_for(app);
        if diag.reachable {
            return Ok(diag);
        }
        std::thread::sleep(Duration::from_millis(350));
    }
    Err(gateway_diagnostics_for(app)
        .error
        .unwrap_or_else(|| "Gateway did not become reachable".into()))
}

pub fn start_gateway(app: &AppHandle) -> Result<GatewayDiagnostics, String> {
    start_gateway_inner(app, false)
}

fn start_gateway_inner(app: &AppHandle, force: bool) -> Result<GatewayDiagnostics, String> {
    *LAST_SPAWN_ERROR.lock().unwrap() = None;

    if !force && curl_health_raw().is_some() {
        return Ok(gateway_diagnostics_for(app));
    }

    stop_gateway();
    free_gateway_port(app);

    #[cfg(debug_assertions)]
    {
        if dev_gateway_root().is_some() {
            append_gateway_log(app, "dev mode: using repo gateway (services/pyai-gateway)");
            spawn_dev_gateway(app)?;
            return wait_for_reachable(app, Duration::from_secs(60)).map_err(|e| {
                *LAST_SPAWN_ERROR.lock().unwrap() = Some(e.clone());
                e
            });
        }
    }

    if let Err(err) = spawn_bundled_gateway(app) {
        *LAST_SPAWN_ERROR.lock().unwrap() = Some(err.clone());
        append_gateway_log(app, &format!("bundled spawn failed: {err}"));
        return Err(err);
    }

    wait_for_reachable(app, Duration::from_secs(60)).map_err(|e| {
        *LAST_SPAWN_ERROR.lock().unwrap() = Some(e.clone());
        e
    })
}

pub fn stop_gateway() {
    if let Some(child) = SIDECAR_GATEWAY.lock().unwrap().take() {
        let _ = child.kill();
    }
    if let Some(mut child) = DEV_GATEWAY.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn curl_gateway(
    path: &str,
    method: &str,
    body: Option<&str>,
    auth_token: Option<&str>,
) -> Result<GatewayFetchResult, String> {
    let path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    };
    let url = format!("http://127.0.0.1:{GATEWAY_PORT}{path}");
    let mut cmd = std::process::Command::new("/usr/bin/curl");
    cmd.args(["-sS", "-X", method, &url, "-w", "\n%{http_code}"]);
    if let Some(token) = auth_token {
        cmd.arg("-H").arg(format!("Authorization: Bearer {token}"));
    }
    if body.is_some() {
        cmd.arg("-H").arg("Content-Type: application/json");
    }
    if let Some(payload) = body {
        cmd.arg("-d").arg(payload);
    }
    let output = cmd.output().map_err(|e| format!("curl failed: {e}"))?;
    let raw = String::from_utf8_lossy(&output.stdout).to_string();
    parse_curl_response(raw, &output.stderr)
}

#[derive(Deserialize)]
pub struct UploadField {
    pub name: String,
    pub value: String,
}

fn parse_curl_response(raw: String, stderr: &[u8]) -> Result<GatewayFetchResult, String> {
    if raw.is_empty() {
        let err = String::from_utf8_lossy(stderr);
        return Err(format!("gateway unreachable: {err}"));
    }
    let (body_text, status_line) = raw
        .rsplit_once('\n')
        .ok_or_else(|| "invalid gateway response".to_string())?;
    let status: u16 = status_line
        .trim()
        .parse()
        .map_err(|_| format!("invalid status: {status_line}"))?;
    Ok(GatewayFetchResult {
        status,
        body: body_text.to_string(),
    })
}

fn curl_multipart_upload_from_file(
    path: &str,
    auth_token: Option<&str>,
    fields: &[UploadField],
    file_field: &str,
    file_name: &str,
    file_mime: &str,
    file_path: &Path,
) -> Result<GatewayFetchResult, String> {
    let path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    };
    let url = format!("http://127.0.0.1:{GATEWAY_PORT}{path}");
    let mut cmd = Command::new("/usr/bin/curl");
    cmd.args(["-sS", "-X", "POST", &url, "-w", "\n%{http_code}"]);
    if let Some(token) = auth_token {
        cmd.arg("-H").arg(format!("Authorization: Bearer {token}"));
    }
    for field in fields {
        cmd.arg("-F").arg(format!("{}={}", field.name, field.value));
    }
    cmd.arg("-F").arg(format!(
        "{file_field}=@{};filename={};type={}",
        file_path.display(),
        file_name,
        file_mime
    ));
    let output = cmd.output().map_err(|e| format!("curl upload failed: {e}"))?;
    let raw = String::from_utf8_lossy(&output.stdout).to_string();
    parse_curl_response(raw, &output.stderr)
}

fn upload_temp_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = gateway_data_dir(app)?.join("upload-tmp");
    fs::create_dir_all(&dir).map_err(|e| format!("upload temp dir: {e}"))?;
    Ok(dir)
}

fn uploads_map() -> Result<std::sync::MutexGuard<'static, Option<HashMap<String, PathBuf>>>, String>
{
    UPLOAD_TEMPS
        .lock()
        .map_err(|e| format!("upload lock: {e}"))
}

#[tauri::command]
pub fn gateway_upload_begin(app: AppHandle, upload_id: String) -> Result<(), String> {
    let dir = upload_temp_dir(&app)?;
    let path = dir.join(format!("{upload_id}.bin"));
    fs::File::create(&path).map_err(|e| format!("upload temp file: {e}"))?;
    let mut guard = uploads_map()?;
    if guard.is_none() {
        *guard = Some(HashMap::new());
    }
    guard
        .as_mut()
        .ok_or_else(|| "upload map missing".to_string())?
        .insert(upload_id, path);
    Ok(())
}

#[tauri::command]
pub fn gateway_upload_append(upload_id: String, chunk: Vec<u8>) -> Result<(), String> {
    append_upload_bytes(&upload_id, &chunk)
}

#[tauri::command]
pub fn gateway_upload_append_b64(upload_id: String, chunk_b64: String) -> Result<(), String> {
    use base64::Engine;
    let chunk = base64::engine::general_purpose::STANDARD
        .decode(chunk_b64.trim())
        .map_err(|e| format!("upload chunk decode: {e}"))?;
    append_upload_bytes(&upload_id, &chunk)
}

fn append_upload_bytes(upload_id: &str, chunk: &[u8]) -> Result<(), String> {
    let mut guard = uploads_map()?;
    let map = guard
        .as_mut()
        .ok_or_else(|| "upload not started".to_string())?;
    let path = map
        .get(upload_id)
        .ok_or_else(|| format!("unknown upload id {upload_id}"))?;
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(path)
        .map_err(|e| format!("upload append open: {e}"))?;
    file.write_all(&chunk)
        .map_err(|e| format!("upload append write: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn gateway_upload_finish(
    upload_id: String,
    path: String,
    auth_token: Option<String>,
    fields: Vec<UploadField>,
    file_field: String,
    file_name: String,
    file_mime: String,
) -> Result<GatewayFetchResult, String> {
    let mut guard = uploads_map()?;
    let map = guard
        .as_mut()
        .ok_or_else(|| "upload not started".to_string())?;
    let temp = map
        .remove(&upload_id)
        .ok_or_else(|| format!("unknown upload id {upload_id}"))?;
    let result = curl_multipart_upload_from_file(
        &path,
        auth_token.as_deref(),
        &fields,
        &file_field,
        &file_name,
        &file_mime,
        &temp,
    );
    let _ = fs::remove_file(&temp);
    result
}

#[tauri::command]
pub fn gateway_diagnostics(app: AppHandle) -> GatewayDiagnostics {
    gateway_diagnostics_for(&app)
}

#[tauri::command]
pub fn gateway_ensure_running(app: AppHandle) -> Result<GatewayDiagnostics, String> {
    if curl_health_raw().is_some() {
        return Ok(gateway_diagnostics_for(&app));
    }
    start_gateway(&app)
}

#[tauri::command]
pub fn gateway_status(app: AppHandle) -> bool {
    gateway_diagnostics_for(&app).reachable
}

#[tauri::command]
pub fn gateway_fetch(
    path: String,
    method: Option<String>,
    body: Option<String>,
    auth_token: Option<String>,
) -> Result<GatewayFetchResult, String> {
    let method = method.unwrap_or_else(|| "GET".to_string());
    curl_gateway(
        &path,
        &method,
        body.as_deref(),
        auth_token.as_deref(),
    )
}

#[tauri::command]
pub fn configure_gateway(app: AppHandle, api_key: String) -> Result<GatewayDiagnostics, String> {
    write_gateway_env(&app, &api_key)?;
    append_gateway_log(&app, "configure_gateway: key saved, restarting");
    stop_gateway();
    free_gateway_port(&app);
    let diag = start_gateway_inner(&app, true)?;
    if !diag.reachable {
        return Err(diag
            .error
            .unwrap_or_else(|| "Gateway not reachable after restart".into()));
    }
    Ok(diag)
}

#[tauri::command]
pub fn save_pyai_api_key(app: AppHandle, api_key: String) -> Result<GatewayDiagnostics, String> {
    configure_gateway(app, api_key)
}

#[tauri::command]
pub fn has_pyai_api_key(app: AppHandle) -> bool {
    gateway_has_api_key(&app)
}
