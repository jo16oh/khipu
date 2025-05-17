#[specta::specta]
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn commands() -> tauri_specta::Commands<tauri::Wry> {
    tauri_specta::collect_commands![greet]
}
