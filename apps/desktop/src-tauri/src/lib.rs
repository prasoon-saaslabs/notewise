#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod gateway;
mod mini_panel;
mod oauth_loopback;
#[cfg(target_os = "macos")]
mod native_link;

#[cfg(target_os = "macos")]
const _: () = native_link::LINKED;

use audio::{
    capture_meters, is_capturing, list_capture_devices, start_system_audio_capture,
    stop_system_audio_capture, sync_tray_recording,
};
use mini_panel::{close_mini_capture_panel, hide_mini_capture_panel, open_mini_capture_panel};
use gateway::{
    configure_gateway, gateway_diagnostics, gateway_ensure_running, gateway_fetch, gateway_status,
    gateway_upload_append, gateway_upload_append_b64, gateway_upload_begin, gateway_upload_finish,
    has_pyai_api_key, save_pyai_api_key, start_gateway, stop_gateway,
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, RunEvent, WindowEvent,
};

use std::sync::atomic::{AtomicBool, Ordering};

static FORCE_QUIT: AtomicBool = AtomicBool::new(false);

fn quit_app(app: &AppHandle) {
    FORCE_QUIT.store(true, Ordering::SeqCst);
    oauth_loopback::stop();
    stop_gateway();
    app.exit(0);
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn start_oauth_loopback(app: AppHandle) -> Result<String, String> {
    oauth_loopback::start(app)?;
    Ok(oauth_loopback::callback_url())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_nspanel::init())
        .invoke_handler(tauri::generate_handler![
            list_capture_devices,
            start_system_audio_capture,
            stop_system_audio_capture,
            capture_meters,
            is_capturing,
            sync_tray_recording,
            open_mini_capture_panel,
            close_mini_capture_panel,
            hide_mini_capture_panel,
            gateway_status,
            gateway_diagnostics,
            gateway_ensure_running,
            gateway_fetch,
            gateway_upload_begin,
            gateway_upload_append,
            gateway_upload_append_b64,
            gateway_upload_finish,
            configure_gateway,
            save_pyai_api_key,
            has_pyai_api_key,
            start_oauth_loopback,
        ])
        .setup(|app| {
            if has_pyai_api_key(app.handle().clone()) {
                if let Err(err) = start_gateway(&app.handle()) {
                    eprintln!("Gateway start warning: {err}");
                }
            }

            let open_i = MenuItem::with_id(app, "open", "Open Notewise", true, None::<&str>)?;
            let capture_i = MenuItem::with_id(app, "capture", "Open capture", true, None::<&str>)?;
            let start_i = MenuItem::with_id(app, "start", "Start recording", true, None::<&str>)?;
            let stop_i = MenuItem::with_id(app, "stop", "Stop recording", true, None::<&str>)?;
            let lib_i = MenuItem::with_id(app, "library", "Open library", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "panic", "Hide mini window", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Notewise", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &open_i,
                    &capture_i,
                    &start_i,
                    &stop_i,
                    &lib_i,
                    &hide_i,
                    &settings_i,
                    &sep,
                    &quit_i,
                ],
            )?;

            let icon = app
                .default_window_icon()
                .cloned()
                .expect("missing app icon for tray");

            let _tray = TrayIconBuilder::with_id("nw-tray")
                .icon(icon)
                .menu(&menu)
                .tooltip("Notewise · Ready")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" | "capture" => {
                        show_main(app);
                        if event.id.as_ref() == "capture" {
                            let _ = app.emit("og://open-capture", ());
                        }
                    }
                    "start" => {
                        show_main(app);
                        let _ = app.emit("og://tray-start", ());
                    }
                    "stop" => {
                        show_main(app);
                        let _ = app.emit("og://tray-stop", ());
                    }
                    "library" => {
                        let _ = app.emit("og://open-library", ());
                        show_main(app);
                    }
                    "panic" => {
                        let _ = app.emit("og://panic-hide", ());
                        let _ = hide_mini_capture_panel(app.clone());
                    }
                    "settings" => {
                        let _ = app.emit("og://open-settings", ());
                        show_main(app);
                    }
                    "quit" => {
                        if is_capturing() {
                            show_main(app);
                            let _ = app.emit("og://tray-stop", ());
                            let app_handle = app.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_secs(4));
                                quit_app(&app_handle);
                            });
                        } else {
                            quit_app(app);
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    "main" => {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    "mini-capture" => {
                        api.prevent_close();
                        let _ = hide_mini_capture_panel(window.app_handle().clone());
                    }
                    _ => {}
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running Notewise desktop")
        .run(|app, event| {
            match event {
                RunEvent::ExitRequested { api, .. } => {
                    if !FORCE_QUIT.load(Ordering::SeqCst) {
                        api.prevent_exit();
                    }
                }
                RunEvent::Exit => {
                    oauth_loopback::stop();
                    stop_gateway();
                    mini_panel::close_on_exit(app);
                }
                _ => {}
            }
        });
}
