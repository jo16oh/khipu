use crate::{
    db,
    util::{get_rw_state, set_rw_state},
};
use eyre::eyre;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

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

    set_rw_state(&app_handle, pool).await?;

    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn close_db(app_handle: AppHandle) -> eyre::Result<()> {
    let lock = get_rw_state::<_, SqlitePool>(&app_handle)?;
    let pool = lock.write().await;
    pool.close().await;

    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn delete_db(app_handle: AppHandle, db_name: String) -> eyre::Result<()> {
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
