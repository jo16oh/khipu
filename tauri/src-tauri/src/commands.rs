pub use crate::db::commands::*;

pub fn commands() -> tauri_specta::Commands<tauri::Wry> {
    tauri_specta::collect_commands![
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
        fetch_deleted_outline_trees,
        clear_unreferenced_deleted_assets,
        clear_deleted_outline,
        clear_all_deleted_outlines
    ]
}
