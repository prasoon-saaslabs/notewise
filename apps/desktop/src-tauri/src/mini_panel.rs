//! macOS NSPanel mini capture floater — stays above other apps (Zoom, Meet, etc.).
//! Standard Tauri WebviewWindow + setAlwaysOnTop is not sufficient on macOS.

use tauri::AppHandle;

const MINI_LABEL: &str = "mini-capture";

#[cfg(target_os = "macos")]
mod macos {
    use super::MINI_LABEL;
    use tauri::{AppHandle, Manager, WebviewUrl};
    use tauri_nspanel::{tauri_panel, CollectionBehavior, ManagerExt, PanelBuilder, PanelLevel};

    tauri_panel! {
        panel!(MiniCapturePanel {
            config: {
                can_become_key_window: true,
                is_floating_panel: true
            }
        })
    }

    pub fn open(app: &AppHandle, url: &str) -> Result<(), String> {
        if let Ok(panel) = app.get_webview_panel(MINI_LABEL) {
            panel.show();
            return Ok(());
        }

        let parsed: tauri::Url = url
            .parse()
            .map_err(|e| format!("invalid mini capture url: {e}"))?;

        let panel = PanelBuilder::<_, MiniCapturePanel>::new(app, MINI_LABEL)
            .url(WebviewUrl::External(parsed))
            .title("Notewise copilot")
            .size(tauri::Size::Logical(tauri::LogicalSize::new(380.0, 300.0)))
            .floating(true)
            .has_shadow(true)
            .level(PanelLevel::Floating)
            .collection_behavior(
                CollectionBehavior::new()
                    .can_join_all_spaces()
                    .full_screen_auxiliary()
                    .ignores_cycle(),
            )
            .build()
            .map_err(|e| format!("{e:?}"))?;

        panel.show();
        Ok(())
    }

    pub fn close(app: &AppHandle) -> Result<(), String> {
        let panel = app
            .get_webview_panel(MINI_LABEL)
            .map_err(|e| format!("{e:?}"))?;
        panel.set_released_when_closed(true);
        if let Some(window) = panel.to_window() {
            window.close().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn hide(app: &AppHandle) -> Result<(), String> {
        let panel = app
            .get_webview_panel(MINI_LABEL)
            .map_err(|e| format!("{e:?}"))?;
        panel.hide();
        Ok(())
    }
}

#[tauri::command]
pub fn open_mini_capture_panel(app: AppHandle, url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return macos::open(&app, &url);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, url);
        Err("Mini capture panel is only supported on macOS".into())
    }
}

#[tauri::command]
pub fn close_mini_capture_panel(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return macos::close(&app);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(())
    }
}

#[tauri::command]
pub fn hide_mini_capture_panel(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return macos::hide(&app);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(())
    }
}

#[cfg(target_os = "macos")]
pub fn close_on_exit(app: &AppHandle) {
    let _ = macos::close(app);
}

#[cfg(not(target_os = "macos"))]
pub fn close_on_exit(_app: &AppHandle) {}
