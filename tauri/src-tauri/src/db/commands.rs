use crate::db::ConnectionState;
use eyre::OptionExt;
use tauri::{AppHandle, Manager, State};

pub use super::query::commands::*;

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn open_db(
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
pub async fn close_db(conn: State<'_, ConnectionState>) -> eyre::Result<()> {
    conn.close().await;
    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn delete_db(
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

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn list_db(app_handle: AppHandle) -> eyre::Result<Vec<String>> {
    let dbs_path = app_handle.path().app_data_dir()?.join("databases");

    if !dbs_path.exists() {
        std::fs::create_dir_all(&dbs_path)?;
    }

    let list: Vec<String> = std::fs::read_dir(dbs_path)?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.is_file() {
                path.to_str()
                    .and_then(|s| s.strip_suffix(".sqlite3"))
                    .map(|s| s.to_owned())
            } else {
                None
            }
        })
        .collect();

    eyre::Ok(list)
}
