#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod gateway;
mod permissions;

use audio::{
    capture_meters, is_capturing, list_capture_devices, set_capturing, start_system_audio_capture,
    stop_system_audio_capture,
};
use gateway::{gateway_status, has_pyai_api_key, save_pyai_api_key, start_gateway, stop_gateway};
use permissions::{
    check_microphone_permission, check_screen_recording_permission, open_system_settings,
    request_microphone_permission, request_screen_recording_permission,
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, WindowEvent,
};

fn set_tray_tooltip(app: &tauri::AppHandle, recording: bool) {
    if let Some(tray) = app.tray_by_id("nw-tray") {
        let label = if recording {
            "Notewise · Recording"
        } else {
            "Notewise · Ready"
        };
        let _ = tray.set_tooltip(Some(label));
    }
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            list_capture_devices,
            start_system_audio_capture,
            stop_system_audio_capture,
            capture_meters,
            is_capturing,
            gateway_status,
            save_pyai_api_key,
            has_pyai_api_key,
            check_microphone_permission,
            request_microphone_permission,
            check_screen_recording_permission,
            request_screen_recording_permission,
            open_system_settings,
        ])
        .setup(|app| {
            if let Err(err) = start_gateway(&app.handle()) {
                eprintln!("Gateway start warning: {err}");
            }

            let open_i = MenuItem::with_id(app, "open", "Open Notewise", true, None::<&str>)?;
            let capture_i = MenuItem::with_id(app, "capture", "Open capture", true, None::<&str>)?;
            let start_i = MenuItem::with_id(app, "start", "Start recording", true, None::<&str>)?;
            let stop_i = MenuItem::with_id(app, "stop", "Stop recording", true, None::<&str>)?;
            let lib_i = MenuItem::with_id(app, "library", "Open library", true, None::<&str>)?;
            let overlay_i =
                MenuItem::with_id(app, "overlay", "Show capture overlay", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "panic", "Hide overlay", true, None::<&str>)?;
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
                    &overlay_i,
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
                        set_capturing(true);
                        set_tray_tooltip(app, true);
                        let _ = app.emit("og://tray-start", ());
                        show_main(app);
                    }
                    "stop" => {
                        set_capturing(false);
                        set_tray_tooltip(app, false);
                        let _ = app.emit("og://tray-stop", ());
                    }
                    "library" => {
                        let _ = app.emit("og://open-library", ());
                        show_main(app);
                    }
                    "overlay" => {
                        let _ = app.emit("og://show-overlay", ());
                    }
                    "panic" => {
                        let _ = app.emit("og://panic-hide", ());
                        if let Some(w) = app.get_webview_window("mini-capture") {
                            let _ = w.hide();
                        }
                    }
                    "settings" => {
                        let _ = app.emit("og://open-settings", ());
                        show_main(app);
                    }
                    "quit" => {
                        stop_gateway();
                        app.exit(0);
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
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running Notewise desktop")
        .run(|_app, event| {
            if let RunEvent::Exit = event {
                stop_gateway();
            }
        });
}
