//! Native OS permission checks.
//!
//! macOS gates microphone access behind AVFoundation authorization and system
//! audio (ScreenCaptureKit) behind Screen Recording permission. On other
//! platforms these are no-ops that report "granted".

#[cfg(target_os = "macos")]
mod imp {
    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_av_foundation::{AVAuthorizationStatus, AVCaptureDevice, AVMediaTypeAudio};
    use objc2_core_graphics::{CGPreflightScreenCaptureAccess, CGRequestScreenCaptureAccess};

    /// One of: "authorized" | "denied" | "restricted" | "notDetermined" | "unknown".
    pub fn microphone_status() -> String {
        // AVMediaTypeAudio is an extern static; reading it is unsafe.
        let media_type = match unsafe { AVMediaTypeAudio } {
            Some(mt) => mt,
            None => return "unknown".to_string(),
        };

        let status = unsafe { AVCaptureDevice::authorizationStatusForMediaType(media_type) };
        match status {
            AVAuthorizationStatus::Authorized => "authorized",
            AVAuthorizationStatus::Denied => "denied",
            AVAuthorizationStatus::Restricted => "restricted",
            AVAuthorizationStatus::NotDetermined => "notDetermined",
            _ => "unknown",
        }
        .to_string()
    }

    /// Fire the macOS microphone permission prompt. The completion handler is a
    /// no-op; the frontend polls `microphone_status()` for the result.
    pub fn request_microphone() {
        let media_type = match unsafe { AVMediaTypeAudio } {
            Some(mt) => mt,
            None => return,
        };
        let handler = RcBlock::new(|_granted: Bool| {});
        unsafe {
            AVCaptureDevice::requestAccessForMediaType_completionHandler(media_type, &handler);
        }
    }

    /// True if Screen Recording (required for system-audio capture) is granted.
    pub fn screen_recording_status() -> bool {
        CGPreflightScreenCaptureAccess()
    }

    /// Prompt for Screen Recording access (opens System Settings if needed).
    pub fn request_screen_recording() -> bool {
        CGRequestScreenCaptureAccess()
    }

    /// Open the relevant macOS System Settings privacy pane.
    pub fn open_privacy_settings(pane: &str) -> Result<(), String> {
        let url = match pane {
            "screen" => {
                "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
            }
            // default to microphone
            _ => "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
        };
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open System Settings: {}", e))
    }
}

#[cfg(not(target_os = "macos"))]
mod imp {
    pub fn microphone_status() -> String {
        "authorized".to_string()
    }
    pub fn request_microphone() {}
    pub fn screen_recording_status() -> bool {
        true
    }
    pub fn request_screen_recording() -> bool {
        true
    }
    pub fn open_privacy_settings(_pane: &str) -> Result<(), String> {
        Ok(())
    }
}

pub use imp::*;

// Tauri command wrappers
#[tauri::command]
pub fn check_microphone_permission() -> String {
    microphone_status()
}

#[tauri::command]
pub fn request_microphone_permission() {
    request_microphone();
}

#[tauri::command]
pub fn check_screen_recording_permission() -> bool {
    screen_recording_status()
}

#[tauri::command]
pub fn request_screen_recording_permission() -> bool {
    request_screen_recording()
}

#[tauri::command]
pub fn open_system_settings(pane: String) -> Result<(), String> {
    open_privacy_settings(&pane)
}
