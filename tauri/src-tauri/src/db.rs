use eyre::{Result, eyre};
use sqlx::{
    Sqlite, SqlitePool,
    migrate::{MigrateDatabase, Migrator},
};
use tauri::{AppHandle, Manager};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn open_connection(app_handle: AppHandle, db_name: String) -> Result<SqlitePool> {
    let dbs_path = app_handle.path().app_data_dir()?.join("databases");

    if !dbs_path.exists() {
        std::fs::create_dir_all(dbs_path.as_path())?;
    }

    let db_path = dbs_path.join(db_name + ".sqlite3");

    let url = db_path.to_str().ok_or(eyre!("invalid sqlite url"))?;
    Sqlite::create_database(url).await?;

    let pool = SqlitePool::connect(url).await?;

    MIGRATOR.run(&pool).await?;

    Ok(pool)
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
        open_connection_in_memory().await;
    }
}
