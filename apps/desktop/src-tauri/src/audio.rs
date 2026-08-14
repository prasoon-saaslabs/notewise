//! Native mic/system capture for macOS desktop.
//!
//! System audio uses ScreenCaptureKit via an Objective-C bridge (no browser share picker).
//! Mic stays in the webview via getUserMedia; system PCM streams over Tauri events.

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

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

#[derive(Clone, Serialize)]
pub struct SystemAudioChunkEvent {
    pub data_b64: String,
    pub sample_rate: u32,
    pub channels: u16,
}

static CAPTURING: AtomicBool = AtomicBool::new(false);
static METERS: Mutex<MeterLevels> = Mutex::new(MeterLevels {
    mic: 0.0,
    system: 0.0,
    backend: String::new(),
});

static AUDIO_APP: OnceLock<AppHandle> = OnceLock::new();
static SYSTEM_AUDIO_ACCUM: Mutex<Vec<f32>> = Mutex::new(Vec::new());

/// ~50 ms of stereo audio @ 48 kHz before emitting to the webview.
const EMIT_FRAME_SAMPLES: usize = 4800;

type SystemAudioCallback = extern "C" fn(*const f32, u32, u32, u16);

#[cfg(target_os = "macos")]
extern "C" {
    fn nw_system_audio_start(callback: SystemAudioCallback) -> i32;
    fn nw_system_audio_stop() -> i32;
}

#[cfg(target_os = "macos")]
fn flush_system_audio_emit(app: &AppHandle, sample_rate: u32, channels: u16) {
    let mut guard = match SYSTEM_AUDIO_ACCUM.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    if guard.is_empty() {
        return;
    }
    let bytes: Vec<u8> = guard.iter().flat_map(|f| f.to_le_bytes()).collect();
    guard.clear();
    drop(guard);
    let data_b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes);
    let _ = app.emit(
        "system-audio-chunk",
        SystemAudioChunkEvent {
            data_b64,
            sample_rate,
            channels,
        },
    );
}

#[cfg(target_os = "macos")]
extern "C" fn on_system_audio_chunk(samples: *const f32, count: u32, sample_rate: u32, channels: u16) {
    if samples.is_null() || count == 0 {
        return;
    }
    let slice = unsafe { std::slice::from_raw_parts(samples, count as usize) };
    let mut sum = 0.0f32;
    for s in slice {
        sum += s * s;
    }
    let rms = (sum / slice.len() as f32).sqrt().min(1.0);
    if let Ok(mut m) = METERS.lock() {
        m.system = rms;
        m.backend = "screencapturekit".into();
    }
    let app = match AUDIO_APP.get() {
        Some(a) => a.clone(),
        None => return,
    };
    if let Ok(mut guard) = SYSTEM_AUDIO_ACCUM.lock() {
        guard.extend_from_slice(slice);
        while guard.len() >= EMIT_FRAME_SAMPLES {
            let chunk: Vec<f32> = guard.drain(..EMIT_FRAME_SAMPLES).collect();
            let bytes: Vec<u8> = chunk.iter().flat_map(|f| f.to_le_bytes()).collect();
            let data_b64 =
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes);
            let _ = app.emit(
                "system-audio-chunk",
                SystemAudioChunkEvent {
                    data_b64,
                    sample_rate,
                    channels,
                },
            );
        }
    }
}

#[cfg(target_os = "macos")]
fn start_native_system_audio(app: &AppHandle) -> Result<(), String> {
    let _ = AUDIO_APP.set(app.clone());
    let code = unsafe { nw_system_audio_start(on_system_audio_chunk) };
    match code {
        0 => Ok(()),
        -1 => Err(
            "Could not access displays for system audio. Grant Screen Recording for Notewise."
                .into(),
        ),
        -2 => Err("No displays available for system audio capture.".into()),
        -3 => Err(
            "ScreenCaptureKit failed to start. Grant Screen Recording for Notewise in System Settings."
                .into(),
        ),
        -4 => Err("Could not attach system audio stream.".into()),
        _ => Err(format!("System audio failed to start (code {code})")),
    }
}

#[cfg(target_os = "macos")]
fn stop_native_system_audio() -> Result<(), String> {
    if let Some(app) = AUDIO_APP.get() {
        flush_system_audio_emit(app, 48_000, 2);
    }
    if let Ok(mut guard) = SYSTEM_AUDIO_ACCUM.lock() {
        guard.clear();
    }
    let code = unsafe { nw_system_audio_stop() };
    if code == 0 {
        Ok(())
    } else {
        Err(format!("System audio failed to stop (code {code})"))
    }
}

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
            name: "System audio (Them)".into(),
            kind: "system".into(),
        },
    ]
}

#[tauri::command]
pub fn start_system_audio_capture(app: AppHandle, device_id: String) -> Result<String, String> {
    if device_id.is_empty() {
        return Err("device_id required".into());
    }

    if !device_id.contains("system") {
        CAPTURING.store(true, Ordering::SeqCst);
        if let Ok(mut m) = METERS.lock() {
            m.backend = "mic".into();
            m.mic = 0.04;
            m.system = 0.0;
        }
        return Ok(format!("started:{device_id}:mic"));
    }

    #[cfg(target_os = "macos")]
    {
        start_native_system_audio(&app)?;
        CAPTURING.store(true, Ordering::SeqCst);
        if let Ok(mut m) = METERS.lock() {
            m.backend = "screencapturekit".into();
            m.system = 0.03;
        }
        return Ok(format!("started:{device_id}:screencapturekit"));
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native system audio capture is only available on macOS".into())
    }
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

    #[cfg(target_os = "macos")]
    {
        return stop_native_system_audio();
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
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

#[tauri::command]
pub fn sync_tray_recording(app: AppHandle, recording: bool) -> Result<(), String> {
    set_capturing(recording);
    if let Some(tray) = app.tray_by_id("nw-tray") {
        let label = if recording {
            "Notewise · Recording"
        } else {
            "Notewise · Ready"
        };
        let _ = tray.set_tooltip(Some(label));
    }
    Ok(())
}
