pub mod commands;
pub mod query;

use eyre::OptionExt;
use sqlx::{
    Sqlite, SqlitePool, SqliteTransaction,
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
        self.0
            .read()
            .await
            .clone()
            .ok_or_eyre("database is not opened")
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

pub trait PoolExt {
    async fn begin_immediate(&self) -> Result<SqliteTransaction, sqlx::Error>;
}

impl PoolExt for SqlitePool {
    async fn begin_immediate(&self) -> Result<SqliteTransaction, sqlx::Error> {
        self.begin_with("BEGIN IMMEDIATE").await
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
