//! Framework symbols used by `libsystem_audio.a` must be linked into the cdylib.
//!
//! `build.rs` emits `cargo:rustc-link-framework`, but Tauri's release link line can
//! omit them for `libnotewise_desktop_lib.dylib`. These `#[link]` attrs force ld
//! to resolve CMSampleBuffer / ScreenCaptureKit references.

#[cfg(target_os = "macos")]
#[link(name = "ScreenCaptureKit", kind = "framework")]
#[link(name = "CoreMedia", kind = "framework")]
#[link(name = "CoreAudio", kind = "framework")]
#[link(name = "AVFoundation", kind = "framework")]
extern "C" {}

#[cfg(target_os = "macos")]
pub(crate) const LINKED: () = ();
