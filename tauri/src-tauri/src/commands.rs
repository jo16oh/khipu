pub use crate::database::commands::*;

pub fn commands() -> tauri_specta::Commands<tauri::Wry> {
    tauri_specta::collect_commands![
        list_graph,
        create_graph,
        open_graph,
        close_graph,
        rename_graph,
        delete_graph,
        timeline,
        search,
        suggest,
        outbound_links,
        inbound_links,
        excerpt,
        tree,
        is_conflicting,
        upsert_outline,
        fetch_deleted_outline_trees,
        clear_unreferenced_deleted_assets,
        clear_deleted_outline,
        clear_all_deleted_outlines
    ]
}
