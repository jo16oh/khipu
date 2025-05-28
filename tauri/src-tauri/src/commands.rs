use crate::db::commands::*;

#[specta::specta]
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn commands() -> tauri_specta::Commands<tauri::Wry> {
    tauri_specta::collect_commands![
        greet,
        open_db,
        close_db,
        delete_db,
        timeline,
        search,
        suggest,
        outbound_links,
        inbound_links,
        tree,
        is_conflicting,
        upsert_outline,
        delete_outline
    ]
}
