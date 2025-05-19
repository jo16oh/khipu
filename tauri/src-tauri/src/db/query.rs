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
    use serde::{Deserialize, Serialize};

    use super::*;
    use crate::db::test::open_connection_in_memory;

    #[tokio::test]
    async fn test_outline_tree() {
        let pool = open_connection_in_memory().await;

        let o1 = Outline::new();
        let o2 = o1.new_child();
        let o3 = o2.new_child();

        upsert_outline(&pool, &o1).await.unwrap();
        upsert_outline(&pool, &o2).await.unwrap();
        upsert_outline(&pool, &o3).await.unwrap();

        let r = outline_tree(&pool, &o2.id).await.unwrap();

        assert_eq!(r.len(), 3);
    }

    #[tokio::test]
    async fn test_path_construction() {
        #[derive(Serialize, Deserialize)]
        struct QueryResult {
            id: String,
            path: String,
        }

        let pool = open_connection_in_memory().await;

        let o1 = Outline::new();
        let o2 = o1.new_child();
        let o3 = o2.new_child();

        upsert_outline(&pool, &o1).await.unwrap();
        upsert_outline(&pool, &o2).await.unwrap();
        upsert_outline(&pool, &o3).await.unwrap();

        // initial path construction
        {
            let results = sqlx::query_as!(
                QueryResult,
                "SELECT id, path FROM outlines ORDER BY path ASC;"
            )
            .fetch_all(&pool)
            .await
            .unwrap();

            assert_eq!(results.len(), 3);
            assert_eq!(results[0].id, o1.id);
            assert_eq!(results[0].path, o1.id);
            assert_eq!(results[1].id, o2.id);
            assert_eq!(results[1].path, o1.id.clone() + "/" + &o2.id);
            assert_eq!(results[2].id, o3.id);
            assert_eq!(results[2].path, o1.id + "/" + &o2.id + "/" + &o3.id);
        }

        // update parent_id to null
        {
            sqlx::query!(
                "UPDATE outlines SET parent_id = ? WHERE id = ?;",
                Option::<String>::None,
                o2.id
            )
            .execute(&pool)
            .await
            .unwrap();

            let r = sqlx::query_scalar!("SELECT path FROM outlines WHERE id = ?;", o2.id)
                .fetch_one(&pool)
                .await
                .unwrap();

            assert_eq!(r, o2.id);
        }

        // update parent_id to o4.id
        {
            let o4 = Outline::new();
            upsert_outline(&pool, &o4).await.unwrap();

            sqlx::query!(
                "UPDATE outlines SET parent_id = ? WHERE id = ?;",
                o4.id,
                o2.id
            )
            .execute(&pool)
            .await
            .unwrap();

            let results = sqlx::query_as!(
                QueryResult,
                "SELECT id, path FROM outlines WHERE path LIKE ? || '%' ORDER BY path ASC;",
                o4.id
            )
            .fetch_all(&pool)
            .await
            .unwrap();

            assert_eq!(results.len(), 3);
            assert_eq!(results[0].id, o4.id);
            assert_eq!(results[0].path, o4.id);
            assert_eq!(results[1].id, o2.id);
            assert_eq!(results[1].path, o4.id.clone() + "/" + &o2.id);
            assert_eq!(results[2].id, o3.id);
            assert_eq!(results[2].path, o4.id + "/" + &o2.id + "/" + &o3.id);
        }
    }
}
