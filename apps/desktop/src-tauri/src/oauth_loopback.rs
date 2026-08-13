use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

const OAUTH_PORT: u16 = 17654;
const OAUTH_PATH: &str = "/auth/callback";

static SERVER_ACTIVE: AtomicBool = AtomicBool::new(false);
static STOP_FLAG: Mutex<Option<std::sync::Arc<AtomicBool>>> = Mutex::new(None);

fn parse_token_from_request(request: &str) -> Option<String> {
    let first_line = request.lines().next()?;
    let mut parts = first_line.split_whitespace();
    let method = parts.next()?;
    if method != "GET" {
        return None;
    }
    let path_and_query = parts.next()?;
    let path = path_and_query.split('?').next()?;
    if path != OAUTH_PATH {
        return None;
    }
    let query = path_and_query.split('?').nth(1)?;
    for part in query.split('&') {
        let (key, value) = part.split_once('=')?;
        if key == "token" && !value.is_empty() {
            return urlencoding::decode(value)
                .ok()
                .map(|v| v.into_owned())
                .or_else(|| Some(value.to_string()));
        }
    }
    None
}

fn respond_success(stream: &mut TcpStream) {
    let body = concat!(
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Notewise</title></head>",
        "<body style=\"font-family:system-ui;max-width:420px;margin:4rem auto;padding:0 1.5rem\">",
        "<h1>Signed in to Notewise</h1>",
        "<p>Return to the Notewise app. You can close this tab.</p>",
        "</body></html>"
    );
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
}

fn respond_not_found(stream: &mut TcpStream) {
    let body = "Not found";
    let response = format!(
        "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
}

fn handle_client(mut stream: TcpStream, app: AppHandle, stop: std::sync::Arc<AtomicBool>) {
    let mut buf = [0u8; 8192];
    let n = stream.read(&mut buf).unwrap_or(0);
    if n == 0 {
        return;
    }
    let request = String::from_utf8_lossy(&buf[..n]);
    if let Some(token) = parse_token_from_request(&request) {
        let _ = app.emit("oauth-callback", token);
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
        respond_success(&mut stream);
    } else {
        respond_not_found(&mut stream);
    }
    stop.store(true, Ordering::SeqCst);
}

pub fn start(app: AppHandle) -> Result<u16, String> {
    if SERVER_ACTIVE.load(Ordering::SeqCst) {
        stop();
        thread::sleep(Duration::from_millis(200));
    }

    let listener = TcpListener::bind(format!("127.0.0.1:{OAUTH_PORT}"))
        .map_err(|e| format!("OAuth callback port {OAUTH_PORT} busy: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("oauth listener: {e}"))?;

    let stop = std::sync::Arc::new(AtomicBool::new(false));
    {
        let mut guard = STOP_FLAG.lock().map_err(|e| e.to_string())?;
        *guard = Some(stop.clone());
    }
    SERVER_ACTIVE.store(true, Ordering::SeqCst);

    let app_handle = app.clone();
    thread::spawn(move || {
        let deadline = std::time::Instant::now() + Duration::from_secs(120);
        while !stop.load(Ordering::SeqCst) && std::time::Instant::now() < deadline {
            match listener.accept() {
                Ok((stream, _)) => {
                    handle_client(stream, app_handle.clone(), stop.clone());
                    break;
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }
        SERVER_ACTIVE.store(false, Ordering::SeqCst);
    });

    Ok(OAUTH_PORT)
}

pub fn stop() {
    if let Ok(mut guard) = STOP_FLAG.lock() {
        if let Some(flag) = guard.take() {
            flag.store(true, Ordering::SeqCst);
        }
    }
    SERVER_ACTIVE.store(false, Ordering::SeqCst);
}

pub fn callback_url() -> String {
    format!("http://127.0.0.1:{OAUTH_PORT}{OAUTH_PATH}")
}
