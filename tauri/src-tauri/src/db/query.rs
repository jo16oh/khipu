use crate::{
    model::{Links, Outline},
    util::{day_start, extract_text_from_doc, uuidv7bs58},
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{SqliteExecutor, SqliteTransaction};
use strum::{Display, EnumString};

mod query_parser;

#[derive(Serialize, Deserialize, specta::Type, Display, EnumString, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "snake_case")]
pub enum TimelineOption {
    CreatedAt,
    UpdatedAt,
}

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum TimelinePosition {
    Before(i64),
    After(i64),
    Latest,
}

impl TimelinePosition {
    fn into_query_params(self) -> (&'static str, i64) {
        match self {
            Self::Latest => ("before", Utc::now().timestamp_millis()),
            Self::Before(ts) => ("before", ts),
            Self::After(ts) => ("after", ts),
        }
    }
}

pub async fn timeline<'a>(
    conn: impl SqliteExecutor<'a> + Send + Copy,
    position: TimelinePosition,
    opt: TimelineOption,
) -> eyre::Result<Vec<Outline>> {
    let opt = opt.to_string();

    let day_start = {
        let (pos, ts) = position.into_query_params();
        sqlx::query_file_scalar!("src/db/fetch_latest_timestamp.sql", pos, ts, opt)
            .fetch_one(conn)
            .await
            .map(day_start)?
    };

    sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_timeline.sql", day_start, opt)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn search<'a>(
    conn: impl SqliteExecutor<'a> + Send + Copy,
    query: &str,
    position: TimelinePosition,
    opt: TimelineOption,
) -> eyre::Result<Vec<Outline>> {
    let sql = query_parser::parse_query(query)?.into_sql();
    let opt = opt.to_string();

    let day_start = {
        let (pos, ts) = position.into_query_params();
        sqlx::query_file_scalar!("src/db/fetch_latest_timestamp.sql", pos, ts, opt)
            .fetch_one(conn)
            .await
            .map(day_start)?
    };

    sqlx::query_as::<_, Outline>(&sql)
        .bind(day_start)
        .bind(opt)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn fetch_forwardlinks<'a>(
    conn: impl SqliteExecutor<'a>,
    id: &str,
) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_forwardlinks.sql", id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn fetch_backlinks<'a>(
    conn: impl SqliteExecutor<'a>,
    id: &str,
) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_backlinks.sql", id, id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn outline_tree<'a>(
    conn: impl SqliteExecutor<'a>,
    id: &str,
) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_outline_tree.sql", id, id, id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn upsert_outline(tx: &mut SqliteTransaction<'_>, outline: &Outline) -> eyre::Result<()> {
    delete_fts_index(tx, &outline.id).await?;

    let rowid = sqlx::query_file_scalar!(
        "src/db/upsert_outline.sql",
        outline.id,
        outline.parent_id,
        outline.findex,
        outline.r#type,
        outline.doc,
        outline.created_at,
        outline.updated_at,
        outline.hidden,
        outline.collapsed,
        outline.deleted
    )
    .fetch_one(&mut **tx)
    .await?;

    insert_fts_index(tx, rowid, &outline.doc).await?;
    sync_outline_links(tx, outline).await?;

    eyre::Ok(())
}

pub async fn delete_outline(tx: &mut SqliteTransaction<'_>, outline_id: &str) -> eyre::Result<()> {
    delete_fts_index(tx, outline_id).await?;

    sqlx::query_file_scalar!("src/db/delete_outline.sql", outline_id)
        .fetch_one(&mut **tx)
        .await?;

    eyre::Ok(())
}

async fn delete_fts_index(tx: &mut SqliteTransaction<'_>, outline_id: &str) -> eyre::Result<()> {
    #[derive(Deserialize)]
    struct Res {
        rowid: i64,
        doc: String,
    }

    // delete index of old document
    if let Some(res) =
        sqlx::query_file_as!(Res, "src/db/fetch_outline_rowid_and_doc.sql", outline_id)
            .fetch_optional(&mut **tx)
            .await?
    {
        let text = extract_text_from_doc(&res.doc)?;
        sqlx::query_file!("src/db/delete_fts_index.sql", res.rowid, text)
            .execute(&mut **tx)
            .await?;
    }

    eyre::Ok(())
}

const ZERO_WIDTH_SPACE: &str = "\u{200B}";

async fn insert_fts_index(
    tx: &mut SqliteTransaction<'_>,
    rowid: i64,
    doc: &str,
) -> eyre::Result<()> {
    // add meaningless two chars to index the end of text correctly by trigram tokenizer
    let text = extract_text_from_doc(doc)? + &ZERO_WIDTH_SPACE.repeat(2);

    sqlx::query_file_scalar!("src/db/insert_fts_index.sql", rowid, text)
        .execute(&mut **tx)
        .await?;

    eyre::Ok(())
}

async fn sync_outline_links(tx: &mut SqliteTransaction<'_>, outline: &Outline) -> eyre::Result<()> {
    let old_links =
        sqlx::query_file_scalar_unchecked!("src/db/fetch_outline_links.sql", outline.id)
            .fetch_optional(&mut **tx)
            .await?
            .map(|json| serde_json::from_str::<Links>(&json))
            .transpose()?
            .unwrap_or(Links::default());

    for l in old_links.difference(&outline.links) {
        sqlx::query_file!("src/db/delete_outline_link.sql", outline.id, l.id)
            .execute(&mut **tx)
            .await?;
    }

    for l in outline.links.difference(&old_links) {
        let link_type = l.r#type.to_string();
        sqlx::query_file!(
            "src/db/insert_outline_link.sql",
            outline.id,
            l.id,
            link_type
        )
        .execute(&mut **tx)
        .await?;
    }

    eyre::Ok(())
}

pub async fn insert_y_update<'a>(
    conn: impl SqliteExecutor<'a>,
    update: &[u8],
    outline_id: &str,
    timestamp: i64,
) -> eyre::Result<()> {
    let id = uuidv7bs58();

    sqlx::query_file!(
        "src/db/insert_y_update.sql",
        id,
        outline_id,
        update,
        timestamp
    )
    .execute(conn)
    .await?;

    eyre::Ok(())
}

#[cfg(test)]
mod test {
    use chrono::Duration;
    use serde::{Deserialize, Serialize};

    use super::*;
    use crate::{
        db::test::open_connection_in_memory,
        model::{Link, LinkType, OutlineType},
        util::SqliteBool,
    };

    #[tokio::test]
    async fn test_outline_tree() {
        let pool = open_connection_in_memory().await;
        let mut tx = pool.begin().await.unwrap();

        let o1 = Outline::new();
        let o2 = o1.new_child();
        let o3 = o2.new_child();

        upsert_outline(&mut tx, &o1).await.unwrap();
        upsert_outline(&mut tx, &o2).await.unwrap();
        upsert_outline(&mut tx, &o3).await.unwrap();

        let r = outline_tree(&mut *tx, &o2.id).await.unwrap();

        assert_eq!(r.len(), 3);
    }

    #[tokio::test]
    async fn test_timeline() {
        let pool = open_connection_in_memory().await;
        let mut tx = pool.begin().await.unwrap();

        let mut tree = Outline::create_tree(2, 3);
        tree[1].updated_at = (Utc::now() - Duration::days(1)).timestamp_millis();
        tree[2].collapsed = SqliteBool(true);

        for o in tree {
            upsert_outline(&mut tx, &o).await.unwrap();
        }

        tx.commit().await.unwrap();

        let r = timeline(
            &pool,
            TimelinePosition::Before((Utc::now() + Duration::days(2)).timestamp_millis()),
            TimelineOption::UpdatedAt,
        )
        .await
        .unwrap();

        assert_eq!(r.len(), 5);
    }

    #[tokio::test]
    async fn test_fetch_forwardlinks() {
        let pool = open_connection_in_memory().await;
        let mut tx = pool.begin().await.unwrap();

        let mut o1 = Outline::new();
        o1.r#type = OutlineType::Heading;
        let mut o2 = Outline::new();
        o2.r#type = OutlineType::Heading;
        let mut o3 = Outline::new();
        o3.r#type = OutlineType::Heading;
        o3.parent_id = Some(o1.id.clone());
        upsert_outline(&mut tx, &o1).await.unwrap();
        upsert_outline(&mut tx, &o2).await.unwrap();
        upsert_outline(&mut tx, &o3).await.unwrap();

        let mut t1 = Outline::create_tree(2, 3);
        t1[0].r#type = OutlineType::Heading;
        t1[1].links.insert(Link {
            id: o1.id.clone(),
            r#type: LinkType::Link,
        });
        t1[2].links.insert(Link {
            id: o2.id.clone(),
            r#type: LinkType::Link,
        });
        t1[3].links.insert(Link {
            id: o3.id.clone(),
            r#type: LinkType::Link,
        });

        for o in t1.iter() {
            upsert_outline(&mut tx, o).await.unwrap();
        }

        tx.commit().await.unwrap();

        let r = fetch_forwardlinks(&pool, &t1[0].id).await.unwrap();

        // forwardlinks in the same tree should be grouped together
        assert_eq!(r.len(), 2);
        // results should be ordered by the order of appearance in the tree
        assert_eq!(r[0].id, o1.id);
        assert_eq!(r[1].id, o2.id);
    }

    #[tokio::test]
    async fn test_fetch_backlinks() {
        let pool = open_connection_in_memory().await;
        let mut tx = pool.begin().await.unwrap();

        let o = Outline::new();
        upsert_outline(&mut tx, &o).await.unwrap();

        let mut t1 = Outline::create_tree(1, 4);
        t1[0].r#type = OutlineType::Heading;
        t1[1].links.insert(Link {
            id: o.id.clone(),
            r#type: LinkType::Link,
        });
        t1[2].r#type = OutlineType::Heading;
        t1[3].links.insert(Link {
            id: o.id.clone(),
            r#type: LinkType::Link,
        });

        for o in t1.iter() {
            upsert_outline(&mut tx, o).await.unwrap();
        }

        let mut t2 = Outline::create_tree(1, 4);
        t2[0].r#type = OutlineType::Heading;
        t2[3].links.insert(Link {
            id: o.id.clone(),
            r#type: LinkType::Link,
        });

        for o in t2.iter() {
            upsert_outline(&mut tx, o).await.unwrap();
        }

        tx.commit().await.unwrap();

        let r = fetch_backlinks(&pool, &o.id).await.unwrap();

        // backlinks in the same tree should be grouped together
        assert_eq!(r.len(), 2);
        // results should be ordered by the number of same links contained in the tree
        assert_eq!(r[0].id, t1[0].id);
        assert_eq!(r[1].id, t2[0].id);
    }

    #[tokio::test]
    async fn test_upsert_outline() {
        let pool = open_connection_in_memory().await;
        let mut tx = pool.begin().await.unwrap();

        let mut o1 = Outline::new();
        o1.doc = r#"{ "text": "test1" }"#.to_string();
        let o2 = Outline::new();
        let o3 = Outline::new();
        upsert_outline(&mut tx, &o1).await.unwrap();
        upsert_outline(&mut tx, &o2).await.unwrap();
        upsert_outline(&mut tx, &o3).await.unwrap();

        o1.doc = r#"{ "text": "test2" }"#.to_string();
        upsert_outline(&mut tx, &o1).await.unwrap();

        // Is old index removed?
        {
            let r = sqlx::query_scalar!(
                r#"
                    SELECT id 
                    FROM outlines o 
                    INNER JOIN fts ON o.rowid = fts.rowid 
                    WHERE fts MATCH 'test1';
                "#
            )
            .fetch_all(&mut *tx)
            .await
            .unwrap();

            assert_eq!(r.len(), 0);
        }

        // Is new document indexed?
        {
            let r = sqlx::query_scalar!(
                r#"
                    SELECT id 
                    FROM outlines o 
                    INNER JOIN fts ON o.rowid = fts.rowid 
                    WHERE fts MATCH 'test2';
                "#
            )
            .fetch_all(&mut *tx)
            .await
            .unwrap();

            assert_eq!(r.len(), 1);
        }

        let mut links = Links::default();
        links.insert(Link {
            id: o2.id.clone(),
            r#type: LinkType::Link,
        });
        links.insert(Link {
            id: o3.id,
            r#type: LinkType::Link,
        });

        o1.links = links.clone();
        upsert_outline(&mut tx, &o1).await.unwrap();

        // Is new links registared?
        {
            let r = outline_tree(&mut *tx, &o1.id).await.unwrap();
            assert_eq!(r[0].links.len(), 2);
        }

        links.remove(&Link {
            id: o2.id,
            r#type: LinkType::Link,
        });

        o1.links = links.clone();
        upsert_outline(&mut tx, &o1).await.unwrap();

        // Is old link removed?
        {
            let r = outline_tree(&mut *tx, &o1.id).await.unwrap();
            assert_eq!(r[0].links.len(), 1);
        }
    }

    #[tokio::test]
    async fn test_path_construction() {
        #[derive(Serialize, Deserialize)]
        struct QueryResult {
            id: String,
            path: String,
        }

        let pool = open_connection_in_memory().await;
        let mut tx = pool.begin().await.unwrap();

        let o1 = Outline::new();
        let o2 = o1.new_child();
        let o3 = o2.new_child();

        upsert_outline(&mut tx, &o1).await.unwrap();
        upsert_outline(&mut tx, &o2).await.unwrap();
        upsert_outline(&mut tx, &o3).await.unwrap();

        // initial path construction
        {
            let results = sqlx::query_as!(
                QueryResult,
                "SELECT id, path FROM outlines ORDER BY path ASC;"
            )
            .fetch_all(&mut *tx)
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
            .execute(&mut *tx)
            .await
            .unwrap();

            let r = sqlx::query_scalar!("SELECT path FROM outlines WHERE id = ?;", o2.id)
                .fetch_one(&mut *tx)
                .await
                .unwrap();

            assert_eq!(r, o2.id);
        }

        // update parent_id to o4.id
        {
            let o4 = Outline::new();
            upsert_outline(&mut tx, &o4).await.unwrap();

            sqlx::query!(
                "UPDATE outlines SET parent_id = ? WHERE id = ?;",
                o4.id,
                o2.id
            )
            .execute(&mut *tx)
            .await
            .unwrap();

            let results = sqlx::query_as!(
                QueryResult,
                "SELECT id, path FROM outlines WHERE path LIKE ? || '%' ORDER BY path ASC;",
                o4.id
            )
            .fetch_all(&mut *tx)
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
