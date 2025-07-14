use std::collections::{HashMap, HashSet};

use crate::{
    doc::extract_text_from_doc,
    model::{Asset, Base64Bytes, Link, Outline},
    util::{day_start, uuidv7bs58},
};
use chrono::Utc;
use eyre::bail;
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

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TimelineResult {
    day_start: i64,
    outlines: Vec<Outline>,
}

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
) -> eyre::Result<TimelineResult> {
    let opt = order_by.to_string();

    let day_start = {
        let (pos, ts) = position.into_query_params();
        sqlx::query_file_scalar!("src/database/fetch_nearest_timestamp.sql", pos, ts, opt)
            .fetch_one(conn)
            .await
            .map(day_start)?
    };

    let outlines =
        sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_timeline.sql", day_start, opt)
            .fetch_all(conn)
            .await?;

    let links = {
        let ids = serde_json::to_string(&outlines.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(
            Outline,
            "src/database/fetch_linked_outlines_to_embed_text.sql",
            ids
        )
        .fetch_all(conn)
        .await?
    };

    Ok(TimelineResult {
        day_start,
        outlines: [outlines, links].into_iter().flatten().collect(),
    })
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
            "src/database/fetch_linked_outlines_to_embed_text.sql",
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
                format!("term LIKE '{token}%'")
            })
            .join(" OR ");

        include_str!("suggest.sql").replace("$cond", &cond)
    };

    let suggestions = sqlx::query_as::<_, Outline>(&query).fetch_all(conn).await?;

    let paths = {
        let ids = serde_json::to_string(&suggestions.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_paths.sql", ids)
            .fetch_all(conn)
            .await?
    };

    Ok((suggestions, paths))
}

pub async fn outbound_links(pool: &SqlitePool, id: &str) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_outbound_links.sql", id)
        .fetch_all(pool)
        .await
        .map_err(eyre::Error::from)
}

pub async fn inbound_links(
    pool: &SqlitePool,
    id: &str,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let links =
        sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_inbound_links.sql", id, offset)
            .fetch_all(pool)
            .await?;

    let contents: Vec<Outline> = JoinSet::from_iter(links.iter().map(|o| {
        let pool = pool.clone();
        let id = o.id.clone();
        async move {
            sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_excerpt.sql", id)
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
            "src/database/fetch_linked_outlines_to_embed_text.sql",
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

pub async fn excerpt<'a>(
    conn: impl SqliteExecutor<'a> + Copy,
    id: &str,
) -> eyre::Result<Vec<Outline>> {
    let contents: Vec<Outline> =
        sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_excerpt.sql", id)
            .fetch_all(conn)
            .await?;

    let linked_outlines = {
        let ids = serde_json::to_string(&contents.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(
            Outline,
            "src/database/fetch_linked_outlines_to_embed_text.sql",
            ids
        )
        .fetch_all(conn)
        .await?
    };

    Ok([contents, linked_outlines].into_iter().flatten().collect())
}

pub async fn tree<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<Vec<Outline>> {
    sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_outline_tree.sql", id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn y_updates<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<Vec<Vec<u8>>> {
    sqlx::query_file_scalar!("src/database/fetch_y_updates.sql", id)
        .fetch_all(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn asset<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<Vec<u8>> {
    sqlx::query_file_scalar!("src/database/fetch_asset.sql", id)
        .fetch_one(conn)
        .await
        .map_err(eyre::Error::from)
}

pub async fn is_conflicting<'a>(
    conn: impl SqliteExecutor<'a> + Copy,
    id: &str,
    doc: &str,
) -> eyre::Result<bool> {
    let text = format!(
        r#""{}""#,
        extract_text_from_doc(conn, doc)
            .await?
            .replace(r#"""#, r#""""#)
    );

    sqlx::query_file_scalar!("src/database/is_conflicting.sql", id, text)
        .fetch_optional(conn)
        .await
        .map(|r| r.is_some())
        .map_err(eyre::Error::from)
}

pub async fn outline_exists<'a>(conn: impl SqliteExecutor<'a>, id: &str) -> eyre::Result<bool> {
    sqlx::query_file_scalar!("src/database/outline_exists.sql", id)
        .fetch_optional(conn)
        .await
        .map(|r| r.is_some())
        .map_err(eyre::Error::from)
}

pub async fn upsert_outline(tx: &mut SqliteTransaction<'_>, outline: &Outline) -> eyre::Result<()> {
    delete_fts_index(tx, &outline.id).await?;

    let rowid = sqlx::query_file_scalar!(
        "src/database/upsert_outline.sql",
        outline.id,
        outline.parent_id,
        outline.findex,
        outline.r#type,
        outline.doc,
        outline.created_at,
        outline.updated_at,
        outline.completed,
        outline.collapsed,
        outline.deleted
    )
    .fetch_one(&mut **tx)
    .await?;

    insert_fts_index(tx, rowid, &outline.doc).await?;

    eyre::Ok(())
}

async fn delete_fts_index(tx: &mut SqliteTransaction<'_>, outline_id: &str) -> eyre::Result<()> {
    #[derive(Deserialize)]
    struct Res {
        rowid: i64,
        doc: String,
    }

    // delete index of old document
    if let Some(res) = sqlx::query_file_as!(
        Res,
        "src/database/fetch_outline_rowid_and_doc.sql",
        outline_id
    )
    .fetch_optional(&mut **tx)
    .await?
    {
        let text = extract_text_from_doc(&mut **tx, &res.doc).await? + &ZERO_WIDTH_SPACE.repeat(2);
        sqlx::query_file!("src/database/delete_fts_index.sql", res.rowid, text)
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
    // add two meaningless chars to index the end of the text correctly by trigram tokenizer
    let text = extract_text_from_doc(&mut **tx, doc).await? + &ZERO_WIDTH_SPACE.repeat(2);

    sqlx::query_file_scalar!("src/database/insert_fts_index.sql", rowid, text)
        .execute(&mut **tx)
        .await?;

    eyre::Ok(())
}

pub async fn sync_links(
    tx: &mut SqliteTransaction<'_>,
    outline_id: &str,
    link_list: HashSet<Link>,
) -> eyre::Result<()> {
    let old_link_list: HashSet<Link> =
        sqlx::query_file_as_unchecked!(Link, "src/database/fetch_link_list.sql", outline_id)
            .fetch_all(&mut **tx)
            .await?
            .into_iter()
            .collect();

    for l in old_link_list.difference(&link_list) {
        sqlx::query_file!("src/database/delete_outline_link.sql", outline_id, l.id)
            .execute(&mut **tx)
            .await?;
    }

    for l in link_list.difference(&old_link_list) {
        let link_type = l.r#type.to_string();
        sqlx::query_file!(
            "src/database/insert_outline_link.sql",
            outline_id,
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
        "src/database/insert_y_update.sql",
        id,
        outline_id,
        update,
        timestamp
    )
    .execute(conn)
    .await?;

    eyre::Ok(())
}

pub async fn sync_assets(
    tx: &mut SqliteTransaction<'_>,
    outline_id: &str,
    asset_list: HashSet<Asset>,
    new_asset_data: HashMap<String, Base64Bytes>,
) -> eyre::Result<()> {
    let old_assetlist: HashSet<Asset> =
        sqlx::query_file_as!(Asset, "src/database/fetch_asset_rel.sql", outline_id)
            .fetch_all(&mut **tx)
            .await?
            .into_iter()
            .collect();

    // Delete asset rels that no longer exist in the provided asset list
    for a in old_assetlist.difference(&asset_list) {
        sqlx::query_file!(
            "src/database/delete_asset_rel.sql",
            outline_id,
            a.hash,
            a.filename,
            a.extension
        )
        .execute(&mut **tx)
        .await?;
    }

    // Insert newly added assets
    for a in asset_list.difference(&old_assetlist) {
        if let Some(data) = new_asset_data.get(&a.hash) {
            let hash = bs58::encode(Sha256::digest(data)).into_string();

            if hash != a.hash {
                bail!("asset hash is incorrect");
            }

            sqlx::query_file!("src/database/insert_asset.sql", hash, data)
                .execute(&mut **tx)
                .await?;

            sqlx::query_file!(
                "src/database/insert_asset_rel.sql",
                outline_id,
                a.hash,
                a.filename,
                a.extension
            )
            .execute(&mut **tx)
            .await?;
        // Check if the same file already exists
        } else if sqlx::query_file_scalar!("src/database/is_asset_exists.sql", a.hash)
            .fetch_optional(&mut **tx)
            .await?
            .is_some()
        {
            sqlx::query_file!(
                "src/database/insert_asset_rel.sql",
                outline_id,
                a.hash,
                a.filename,
                a.extension
            )
            .execute(&mut **tx)
            .await?;
        } else {
            bail!("new asset data is not provided");
        }
    }

    eyre::Ok(())
}

pub async fn fetch_deleted_outline_trees<'a>(
    conn: impl SqliteExecutor<'a> + Copy + Send,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let deleted_trees = sqlx::query_file_as_unchecked!(
        Outline,
        "src/database/fetch_deleted_outline_trees.sql",
        offset
    )
    .fetch_all(conn)
    .await?;

    let paths = {
        let ids = serde_json::to_string(&deleted_trees.iter().map(|o| &o.id).collect_vec())?;
        sqlx::query_file_as_unchecked!(Outline, "src/database/fetch_paths.sql", ids)
            .fetch_all(conn)
            .await?
    };

    Ok((deleted_trees, paths))
}

pub async fn clear_unreferenced_deleted_assets(tx: &mut SqliteTransaction<'_>) -> eyre::Result<()> {
    sqlx::query_file!("src/database/clear_unreferenced_deleted_assets.sql")
        .execute(&mut **tx)
        .await?;
    eyre::Ok(())
}

pub async fn clear_deleted_outline(tx: &mut SqliteTransaction<'_>, id: &str) -> eyre::Result<()> {
    sqlx::query_file!("src/database/clear_deleted_outline.sql", id)
        .execute(&mut **tx)
        .await?;
    eyre::Ok(())
}

pub async fn clear_all_deleted_outlines(tx: &mut SqliteTransaction<'_>) -> eyre::Result<()> {
    sqlx::query_file!("src/database/clear_all_deleted_outlines.sql")
        .execute(&mut **tx)
        .await?;
    eyre::Ok(())
}

pub async fn docs<'a>(
    conn: impl SqliteExecutor<'a>,
    ids: &[&str],
) -> eyre::Result<Vec<(String, String)>> {
    #[derive(Debug)]
    struct QueryResult {
        id: String,
        doc: String,
    }

    let ids = serde_json::to_string(ids)?;

    let docs = sqlx::query_file_as!(QueryResult, "src/database/fetch_docs.sql", ids)
        .fetch_all(conn)
        .await?
        .into_iter()
        .map(|r| (r.id, r.doc))
        .collect_vec();

    Ok(docs)
}
