use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Child;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

static DEV_GATEWAY: Mutex<Option<Child>> = Mutex::new(None);
static SIDECAR_GATEWAY: Mutex<Option<CommandChild>> = Mutex::new(None);

const GATEWAY_PORT: &str = "3002";
const HEALTH_URL: &str = "http://127.0.0.1:3002/health";

fn gateway_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?
        .join("data");
    fs::create_dir_all(&dir).map_err(|e| format!("create data dir: {e}"))?;
    Ok(dir)
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
    let mut f = fs::File::create(&path).map_err(|e| format!("write gateway.env: {e}"))?;
    writeln!(f, "PYAI_API_KEY={key}").map_err(|e| format!("write gateway.env: {e}"))?;
    Ok(())
}

fn dev_gateway_root() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    [
        cwd.join("services/pyai-gateway"),
        cwd.join("../../services/pyai-gateway"),
        cwd.join("../../../services/pyai-gateway"),
    ]
    .into_iter()
    .find(|p| p.join(".venv").exists())
}

fn spawn_dev_gateway(app: &AppHandle) -> Result<(), String> {
    let gw_root = dev_gateway_root().ok_or_else(|| {
        "Dev gateway not found. Run `make setup` in the notewise repo.".to_string()
    })?;
    let py = gw_root.join(".venv/bin/python");
    if !py.exists() {
        return Err(format!("Missing venv at {}", py.display()));
    }
    let data_dir = gateway_data_dir(app)?;
    let child = std::process::Command::new(py)
        .current_dir(&gw_root)
        .env("NOTEWISE_PYAI_DATA_DIR", &data_dir)
        .env("PYAI_GATEWAY_PORT", GATEWAY_PORT)
        .env("PYAI_GATEWAY_HOST", "127.0.0.1")
        .args([
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            GATEWAY_PORT,
            "--log-level",
            "info",
            "--no-access-log",
        ])
        .spawn()
        .map_err(|e| format!("spawn dev gateway: {e}"))?;
    *DEV_GATEWAY.lock().unwrap() = Some(child);
    Ok(())
}

fn spawn_bundled_gateway(app: &AppHandle) -> Result<(), String> {
    let data_dir = gateway_data_dir(app)?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource dir: {e}"))?;

    let sidecar = app
        .shell()
        .sidecar("notewise-gateway")
        .map_err(|e| format!("sidecar not bundled: {e}"))?;

    let (_rx, child) = sidecar
        .env("NOTEWISE_RESOURCE_DIR", &resource_dir)
        .env("NOTEWISE_PYAI_DATA_DIR", &data_dir)
        .env("PYAI_GATEWAY_PORT", GATEWAY_PORT)
        .env("PYAI_GATEWAY_HOST", "127.0.0.1")
        .spawn()
        .map_err(|e| format!("spawn sidecar: {e}"))?;

    *SIDECAR_GATEWAY.lock().unwrap() = Some(child);
    Ok(())
}

pub fn start_gateway(app: &AppHandle) -> Result<(), String> {
    if gateway_healthy() {
        return Ok(());
    }

    let bundled = spawn_bundled_gateway(app);
    if bundled.is_err() {
        #[cfg(debug_assertions)]
        spawn_dev_gateway(app)?;
        #[cfg(not(debug_assertions))]
        bundled?;
    }

    wait_for_healthy(Duration::from_secs(45))
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

pub fn gateway_healthy() -> bool {
    std::process::Command::new("/usr/bin/curl")
        .args(["-sf", HEALTH_URL])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn wait_for_healthy(timeout: Duration) -> Result<(), String> {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if gateway_healthy() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(350));
    }
    Err(
        "Notewise gateway did not start. Add your PyAI API key in Settings → API key.".into(),
    )
}

#[tauri::command]
pub fn gateway_status() -> bool {
    gateway_healthy()
}

#[tauri::command]
pub fn save_pyai_api_key(app: AppHandle, api_key: String) -> Result<(), String> {
    write_gateway_env(&app, &api_key)?;
    stop_gateway();
    start_gateway(&app)?;
    Ok(())
}

#[tauri::command]
pub fn has_pyai_api_key(app: AppHandle) -> bool {
    let Ok(dir) = gateway_data_dir(&app) else {
        return false;
    };
    let path = dir.join("gateway.env");
    if !path.exists() {
        return false;
    }
    fs::read_to_string(path)
        .ok()
        .map(|s| {
            s.lines().any(|l| {
                l.starts_with("PYAI_API_KEY=") && l.len() > "PYAI_API_KEY=".len()
            })
        })
        .unwrap_or(false)
}
