//! Compile ScreenCaptureKit bridge with clang (Command Line Tools) — no Swift / Xcode.

fn main() {
    #[cfg(target_os = "macos")]
    compile_system_audio();
    tauri_build::build();
}

#[cfg(target_os = "macos")]
fn compile_system_audio() {
    println!("cargo:rerun-if-changed=native/system_audio.m");
    println!("cargo:rerun-if-changed=native/system_audio.h");

    // ScreenCaptureKit system audio requires macOS 13+ (matches tauri.conf minimumSystemVersion).
    println!("cargo:rustc-env=MACOSX_DEPLOYMENT_TARGET=13.0");
    println!("cargo:rustc-link-arg=-mmacosx-version-min=13.0");

    cc::Build::new()
        .file("native/system_audio.m")
        .flag("-fobjc-arc")
        .flag("-mmacosx-version-min=13.0")
        .compile("system_audio");

    for fw in [
        "ScreenCaptureKit",
        "CoreMedia",
        "CoreAudio",
        "AVFoundation",
        "Foundation",
    ] {
        println!("cargo:rustc-link-framework={fw}");
    }
}
