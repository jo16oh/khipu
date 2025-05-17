use crate::{db, util::set_rw_state};
use eyre::eyre;
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn open_db(app_handle: AppHandle, db_name: String) -> eyre::Result<()> {
    let dbs_path = app_handle.path().app_data_dir()?.join("databases");

    if !dbs_path.exists() {
        std::fs::create_dir_all(dbs_path.as_path())?;
    }

    let db_path = dbs_path.join(db_name + ".sqlite3");
    let url = db_path.to_str().ok_or(eyre!("invalid sqlite url"))?;
    let pool = db::open_connection(url).await?;

    set_rw_state(&app_handle, RwLock::new(pool)).await?;

    eyre::Ok(())
}

#[specta::specta]
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn commands() -> tauri_specta::Commands<tauri::Wry> {
    tauri_specta::collect_commands![greet, open_db]
}
