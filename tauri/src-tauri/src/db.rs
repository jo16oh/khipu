mod query;

use eyre::OptionExt;
use sqlx::{
    Sqlite, SqlitePool,
    migrate::{MigrateDatabase, Migrator},
};
use tokio::sync::RwLock;

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub struct ConnectionState(RwLock<Option<SqlitePool>>);

impl ConnectionState {
    pub fn new() -> Self {
        ConnectionState(RwLock::new(None))
    }

    pub async fn pool(&self) -> eyre::Result<SqlitePool> {
        self.0.read().await.clone().ok_or_eyre("db is not opened")
    }

    pub async fn open(&self, url: &str) -> eyre::Result<()> {
        let mut guard = self.0.write().await;

        Sqlite::create_database(url).await?;
        let pool = SqlitePool::connect(url).await?;
        MIGRATOR.run(&pool).await?;
        *guard = Some(pool);

        Ok(())
    }

    pub async fn close(&self) {
        let mut guard = self.0.write().await;
        *guard = None;
    }
}

pub mod commands {
    use crate::db::ConnectionState;
    use eyre::OptionExt;
    use tauri::{AppHandle, Manager, State};

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
}

#[cfg(test)]
pub mod test {
    use super::*;

    pub async fn open_connection_in_memory() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        MIGRATOR.run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test() {
        let pool = open_connection_in_memory().await;

        let r = sqlx::query!("SELECT * FROM outlines;")
            .fetch_all(&pool)
            .await;

        assert!(r.is_ok());
    }
}
