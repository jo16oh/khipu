use crate::{
    model::{Asset, LinkList, Outline},
    util::{day_start, extract_text_from_doc, uuidv7bs58},
};
use chrono::Utc;
use itertools::Itertools;
use ngrams::Ngram;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{SqliteExecutor, SqlitePool, SqliteTransaction};
use strum::{Display, EnumString};
use tokio::task::JoinSet;

pub mod commands;
mod fts_query_parser;

#[cfg(test)]
mod tests;

#[derive(Serialize, Deserialize, specta::Type, Display, EnumString, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "snake_case")]
pub enum OrderBy {
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

const ZERO_WIDTH_SPACE: &str = "\u{200B}";

pub async fn timeline<'a>(
    conn: impl SqliteExecutor<'a> + Send + Copy,
    position: TimelinePosition,
    order_by: OrderBy,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let opt = order_by.to_string();

    let day_start = {
        let (pos, ts) = position.into_query_params();
        sqlx::query_file_scalar!("src/db/fetch_nearest_timestamp.sql", pos, ts, opt)
            .fetch_one(conn)
            .await
            .map(day_start)?
    };

    let results =
        sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_timeline.sql", day_start, opt)
            .fetch_all(conn)
            .await?;

    let links = {
        let ids = serde_json::to_string(&results.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(
            Outline,
            "src/db/fetch_linked_outlines_to_embed_text.sql",
            ids
        )
        .fetch_all(conn)
        .await?
    };

    Ok((results, links))
}

pub async fn search<'a>(
    conn: impl SqliteExecutor<'a> + Send + Copy,
    query: &str,
    order_by: OrderBy,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let results =
        sqlx::query_as::<_, Outline>(&fts_query_parser::parse(query)?.into_sql(&order_by))
            .bind(offset)
            .fetch_all(conn)
            .await?;

    let links = {
        let ids = serde_json::to_string(&results.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(
            Outline,
            "src/db/fetch_linked_outlines_to_embed_text.sql",
            ids
        )
        .fetch_all(conn)
        .await?
    };

    Ok((results, links))
}

pub async fn suggest<'a>(
    conn: impl SqliteExecutor<'a> + Send + Copy,
    query: &str,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let query = {
        let cond = (String::new() + query + &ZERO_WIDTH_SPACE.repeat(2))
            .chars()
            .ngrams(2)
            .map(|cs| {
                let token = cs.iter().collect::<String>().replace("'", "''");
                format!("term LIKE '{}%'", token)
            })
            .join(" OR ");

        include_str!("suggest.sql").replace("$cond", &cond)
    };

    let suggestions = sqlx::query_as::<_, Outline>(&query).fetch_all(conn).await?;

    let paths = {
        let ids = serde_json::to_string(&suggestions.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_paths.sql", ids)
            .fetch_all(conn)
            .await?
    };

    Ok((suggestions, paths))
}

pub async fn outbound_links(
    pool: &SqlitePool,
    id: &str,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let links =
        sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_outbound_links.sql", id, offset)
            .fetch_all(pool)
            .await?;

    let contents: Vec<Outline> = JoinSet::from_iter(links.iter().map(|o| {
        let pool = pool.clone();
        let id = o.id.clone();
        async move {
            sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_excerpt.sql", id)
                .fetch_all(&pool)
                .await
        }
    }))
    .join_all()
    .await
    .into_iter()
    .map(|r| r.map_err(eyre::Error::from))
    .collect::<eyre::Result<Vec<Vec<Outline>>>>()?
    .into_iter()
    .flatten()
    .collect();

    let linked_outlines = {
        let ids = serde_json::to_string(&contents.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(
            Outline,
            "src/db/fetch_linked_outlines_to_embed_text.sql",
            ids
        )
        .fetch_all(pool)
        .await?
    };

    Ok((
        links,
        [contents, linked_outlines].into_iter().flatten().collect(),
    ))
}

pub async fn inbound_links(
    pool: &SqlitePool,
    id: &str,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let links =
        sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_inbound_links.sql", id, offset)
            .fetch_all(pool)
            .await?;

    let contents: Vec<Outline> = JoinSet::from_iter(links.iter().map(|o| {
        let pool = pool.clone();
        let id = o.id.clone();
        async move {
            sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_excerpt.sql", id)
                .fetch_all(&pool)
                .await
        }
    }))
    .join_all()
    .await
    .into_iter()
    .map(|r| r.map_err(eyre::Error::from))
    .collect::<eyre::Result<Vec<Vec<Outline>>>>()?
    .into_iter()
    .flatten()
    .collect();

    let linked_outlines = {
        let ids = serde_json::to_string(&contents.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(
            Outline,
            "src/db/fetch_linked_outlines_to_embed_text.sql",
            ids
        )
        .fetch_all(pool)
        .await?
    };

    Ok((
        links,
        [contents, linked_outlines].into_iter().flatten().collect(),
    ))
}

pub async fn tree<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/db/fetch_outline_tree.sql", id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn y_updates<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<Vec<Vec<u8>>> {
    sqlx::query_file_scalar!("src/db/fetch_y_updates.sql", id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn asset<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<Asset> {
    sqlx::query_file_as!(Asset, "src/db/fetch_asset.sql", id)
        .fetch_one(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn is_conflicting<'a>(
    conn: impl SqliteExecutor<'a>,
    id: &str,
    doc: &str,
) -> eyre::Result<bool> {
    let text = format!(
        r#""{}""#,
        extract_text_from_doc(doc)?.replace(r#"""#, r#""""#)
    );

    sqlx::query_file_scalar!("src/db/is_conflicting.sql", id, text)
        .fetch_optional(conn)
        .await
        .map(|r| r.is_some())
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
        outline.completed,
        outline.collapsed
    )
    .fetch_one(&mut **tx)
    .await?;

    insert_fts_index(tx, rowid, &outline.doc).await?;
    sync_outline_links(tx, outline).await?;

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
    let old_linklist = sqlx::query_file_scalar_unchecked!("src/db/fetch_linklist.sql", outline.id)
        .fetch_optional(&mut **tx)
        .await?
        .map(|json| serde_json::from_str::<LinkList>(&json))
        .transpose()?
        .unwrap_or(LinkList::default());

    for l in old_linklist.difference(&outline.linklist) {
        sqlx::query_file!("src/db/delete_outline_link.sql", outline.id, l.id)
            .execute(&mut **tx)
            .await?;
    }

    for l in outline.linklist.difference(&old_linklist) {
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

pub async fn insert_y_updates<'a>(
    conn: impl SqliteExecutor<'a>,
    updates: &[impl AsRef<[u8]>],
    outline_id: &str,
    timestamp: i64,
) -> eyre::Result<()> {
    let id = uuidv7bs58();
    let update = yrs::merge_updates_v2(updates)?;

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

pub async fn insert_asset<'a>(conn: impl SqliteExecutor<'a>, asset: Asset) -> eyre::Result<()> {
    let id = bs58::encode(Sha256::digest(&asset.data)).into_string();

    sqlx::query_file!(
        "src/db/insert_asset.sql",
        id,
        asset.filename,
        asset.extension,
        asset.data
    )
    .execute(conn)
    .await?;

    eyre::Ok(())
}

pub async fn delete_outline(tx: &mut SqliteTransaction<'_>, outline_id: &str) -> eyre::Result<()> {
    delete_fts_index(tx, outline_id).await?;

    sqlx::query_file_scalar!("src/db/delete_outline.sql", outline_id)
        .fetch_one(&mut **tx)
        .await?;

    eyre::Ok(())
}
