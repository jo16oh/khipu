use crate::db::ConnectionState;
use eyre::OptionExt;
use tauri::{AppHandle, Manager, State};

pub fn commands() -> tauri_specta::Commands<tauri::Wry> {
    tauri_specta::collect_commands![greet, open_db, close_db, delete_db]
}

#[specta::specta]
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
async fn open_db(
    app_handle: AppHandle,
    conn: State<'_, ConnectionState>,
    db_name: String,
) -> eyre::Result<()> {
    let dbs_path = app_handle.path().app_data_dir()?.join("databases");

    if !dbs_path.exists() {
        std::fs::create_dir_all(dbs_path.as_path())?;
    }

    let db_path = dbs_path.join(db_name + ".sqlite3");
    let url = db_path.to_str().ok_or_eyre("invalid sqlite url")?;

    conn.open(url).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
async fn close_db(conn: State<'_, ConnectionState>) -> eyre::Result<()> {
    conn.close().await;
    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
async fn delete_db(
    app_handle: AppHandle,
    conn: State<'_, ConnectionState>,
    db_name: String,
) -> eyre::Result<()> {
    conn.close().await;

    let db_path = app_handle
        .path()
        .app_data_dir()?
        .join("databases")
        .join(db_name + ".sqlite3");

    if db_path.exists() {
        std::fs::remove_file(db_path)?;
    }

    eyre::Ok(())
}
