use crate::model::Outline;
use sqlx::SqliteExecutor;

pub async fn outline_tree<'a>(
    conn: impl SqliteExecutor<'a>,
    id: &str,
) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_outline_tree.sql", id, id, id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn upsert_outline<'a>(
    conn: impl SqliteExecutor<'a>,
    outline: &Outline,
) -> eyre::Result<()> {
    sqlx::query_file!(
        "src/db/upsert_outline.sql",
        outline.id,
        outline.parent_id,
        outline.findex,
        outline.doc,
        outline.created_at,
        outline.updated_at,
        outline.hidden,
        outline.collapsed,
        outline.deleted
    )
    .execute(conn)
    .await?;

    eyre::Ok(())
}

#[cfg(test)]
mod test {
    use std::time::Instant;

    use super::*;
    use crate::db::test::open_connection_in_memory;

    #[tokio::test]
    async fn test() {
        let pool = open_connection_in_memory().await;

        let o1 = Outline::new();
        let o2 = o1.new_child();
        let o3 = o2.new_child();

        upsert_outline(&pool, &o1).await.unwrap();
        upsert_outline(&pool, &o2).await.unwrap();
        upsert_outline(&pool, &o3).await.unwrap();

        let start = Instant::now();

        let r = outline_tree(&pool, &o2.id).await.unwrap();

        println!("{}", start.elapsed().as_micros());

        assert_eq!(r.len(), 3);
    }
}
