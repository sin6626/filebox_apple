use std::env;
use std::fs;
use std::path::PathBuf;

fn get_storage_dir() -> PathBuf {
    let mut path = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    path.push("Storage");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

#[tauri::command]
fn copy_file_to_storage(src_path: String, dest_filename: String) -> Result<String, String> {
    let storage_dir = get_storage_dir();
    let dest_path = storage_dir.join(&dest_filename);
    
    match fs::copy(&src_path, &dest_path) {
        Ok(_) => Ok(dest_path.to_string_lossy().into_owned()),
        Err(e) => Err(format!("Failed to copy file: {}", e)),
    }
}

#[tauri::command]
fn load_metadata() -> Result<String, String> {
    let storage_dir = get_storage_dir();
    let meta_path = storage_dir.join("metadata.json");
    
    if !meta_path.exists() {
        return Ok("[]".to_string());
    }
    
    match fs::read_to_string(&meta_path) {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("Failed to read metadata: {}", e)),
    }
}

#[tauri::command]
fn save_metadata(data: String) -> Result<(), String> {
    let storage_dir = get_storage_dir();
    let meta_path = storage_dir.join("metadata.json");
    
    match fs::write(&meta_path, data) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write metadata: {}", e)),
    }
}

#[tauri::command]
fn delete_file(filename: String) -> Result<(), String> {
    let storage_dir = get_storage_dir();
    let file_path = storage_dir.join(&filename);
    
    if file_path.exists() {
        match fs::remove_file(&file_path) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to delete file: {}", e)),
        }
    } else {
        Ok(())
    }
}

use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn open_file(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let storage_dir = get_storage_dir();
    let file_path = storage_dir.join(&filename);
    
    if file_path.exists() {
        app.opener().open_path(file_path.to_string_lossy().to_string(), None::<&str>)
            .map_err(|e| format!("Failed to open file: {}", e))
    } else {
        Err("File not found".to_string())
    }
}

#[tauri::command]
fn run_app(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch app: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_app_icon(path: String) -> Result<String, String> {
    let script = format!(
        "Add-Type -AssemblyName System.Drawing; \
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{}'); \
        if ($icon -ne $null) {{ \
            $bitmap = $icon.ToBitmap(); \
            $stream = New-Object System.IO.MemoryStream; \
            $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png); \
            [Convert]::ToBase64String($stream.ToArray()); \
        }}",
        path.replace("'", "''")
    );

    let output = std::process::Command::new("powershell")
        .args(&["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let b64 = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !b64.is_empty() {
            return Ok(b64);
        }
    }
    Err("Failed to extract icon".to_string())
}

#[tauri::command]
fn get_storage_dir_path() -> Result<String, String> {
    Ok(get_storage_dir().to_string_lossy().into_owned())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            copy_file_to_storage,
            load_metadata,
            save_metadata,
            delete_file,
            get_storage_dir_path,
            open_file,
            run_app,
            get_app_icon
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
