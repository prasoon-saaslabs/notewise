//! Mic + optional system-audio capture.
//!
//! Real PCM to Hear is mixed in the webview (getUserMedia + getDisplayMedia).
//! On macOS, Chromium's display-audio path is ScreenCaptureKit. If TCC denies
//! or the user cancels, the UI falls back to mic-only (PRD hour-1 spike).
//! This module tracks Idle/Recording and exposes tray meters.

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

#[derive(Debug, Serialize, Clone)]
pub struct CaptureDevice {
    pub id: String,
    pub name: String,
    pub kind: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct MeterLevels {
    pub mic: f32,
    pub system: f32,
    pub backend: String,
}

static CAPTURING: AtomicBool = AtomicBool::new(false);
static METERS: Mutex<MeterLevels> = Mutex::new(MeterLevels {
    mic: 0.0,
    system: 0.0,
    backend: String::new(),
});

#[tauri::command]
pub fn list_capture_devices() -> Vec<CaptureDevice> {
    vec![
        CaptureDevice {
            id: "mic-default".into(),
            name: "Default microphone (You)".into(),
            kind: "microphone".into(),
        },
        CaptureDevice {
            id: "system-sck".into(),
            name: "System audio / ScreenCaptureKit (Them)".into(),
            kind: "system".into(),
        },
    ]
}

#[tauri::command]
pub fn start_system_audio_capture(device_id: String) -> Result<String, String> {
    if device_id.is_empty() {
        return Err("device_id required".into());
    }
    CAPTURING.store(true, Ordering::SeqCst);
    let backend = if cfg!(target_os = "macos") && device_id.contains("system") {
        "screencapturekit"
    } else {
        "mic"
    };
    if let Ok(mut m) = METERS.lock() {
        m.backend = backend.into();
        m.mic = 0.04;
        m.system = if backend == "screencapturekit" { 0.03 } else { 0.0 };
    }
    Ok(format!("started:{device_id}:{backend}"))
}

#[tauri::command]
pub fn stop_system_audio_capture(session_token: String) -> Result<(), String> {
    CAPTURING.store(false, Ordering::SeqCst);
    if !session_token.is_empty() && !session_token.starts_with("started:") {
        return Err("invalid session token".into());
    }
    if let Ok(mut m) = METERS.lock() {
        m.mic = 0.0;
        m.system = 0.0;
    }
    Ok(())
}

#[tauri::command]
pub fn capture_meters() -> MeterLevels {
    METERS.lock().map(|m| m.clone()).unwrap_or(MeterLevels {
        mic: 0.0,
        system: 0.0,
        backend: "mic".into(),
    })
}

#[tauri::command]
pub fn is_capturing() -> bool {
    CAPTURING.load(Ordering::SeqCst)
}

pub fn set_capturing(v: bool) {
    CAPTURING.store(v, Ordering::SeqCst);
}
