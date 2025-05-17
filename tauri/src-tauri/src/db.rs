use eyre::Result;
use sqlx::{
    Sqlite, SqlitePool,
    migrate::{MigrateDatabase, Migrator},
};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn open_connection(url: &str) -> Result<SqlitePool> {
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
        let pool = open_connection_in_memory().await;

        let r = sqlx::query!("SELECT * FROM outlines;")
            .fetch_all(&pool)
            .await;

        assert!(r.is_ok());
    }
}
