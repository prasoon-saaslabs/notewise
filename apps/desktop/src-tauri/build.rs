fn main() {
    #[cfg(target_os = "macos")]
    compile_system_audio();
    tauri_build::build();
}

#[cfg(target_os = "macos")]
fn compile_system_audio() {
    use std::path::PathBuf;
    use std::process::Command;

    println!("cargo:rerun-if-changed=native/system_audio.swift");

    let out_dir = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR"));
    let lib_path = out_dir.join("libsystem_audio.a");
    let src = PathBuf::from("native/system_audio.swift");

    let status = Command::new("swiftc")
        .args([
            "-emit-library",
            "-static",
            "-O",
            "-whole-module-optimization",
            "-module-name",
            "SystemAudio",
            "-o",
            lib_path.to_str().expect("lib path utf8"),
            src.to_str().expect("swift src utf8"),
            "-framework",
            "ScreenCaptureKit",
            "-framework",
            "CoreMedia",
            "-framework",
            "CoreAudio",
            "-framework",
            "AVFoundation",
        ])
        .status()
        .expect("failed to invoke swiftc for system audio");

    if !status.success() {
        panic!("swiftc failed to compile native/system_audio.swift");
    }

    println!("cargo:rustc-link-search=native={}", out_dir.display());
    println!("cargo:rustc-link-lib=static=system_audio");
    println!("cargo:rustc-link-framework=ScreenCaptureKit");
    println!("cargo:rustc-link-framework=CoreMedia");
    println!("cargo:rustc-link-framework=CoreAudio");
    println!("cargo:rustc-link-framework=AVFoundation");
}
