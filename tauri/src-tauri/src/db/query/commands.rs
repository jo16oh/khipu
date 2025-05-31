use std::collections::{HashMap, HashSet};

use super::*;
use crate::{
    db::ConnectionState,
    model::{Base64Bytes, Outline},
};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn timeline(
    conn: State<'_, ConnectionState>,
    position: TimelinePosition,
    order_by: OrderBy,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let pool = conn.pool().await?;
    super::timeline(&pool, position, order_by).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn search(
    conn: State<'_, ConnectionState>,
    query: String,
    order_by: OrderBy,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let pool = conn.pool().await?;
    super::search(&pool, &query, order_by, offset).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn suggest(
    conn: State<'_, ConnectionState>,
    id: String,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let pool = conn.pool().await?;
    super::suggest(&pool, &id).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn outbound_links(
    conn: State<'_, ConnectionState>,
    id: String,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let pool = conn.pool().await?;
    super::outbound_links(&pool, &id, offset).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn inbound_links(
    conn: State<'_, ConnectionState>,
    id: String,
    offset: i64,
) -> eyre::Result<(Vec<Outline>, Vec<Outline>)> {
    let pool = conn.pool().await?;
    super::inbound_links(&pool, &id, offset).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn tree(conn: State<'_, ConnectionState>, id: String) -> eyre::Result<Vec<Outline>> {
    let pool = conn.pool().await?;
    super::tree(&pool, &id).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn is_conflicting(
    conn: State<'_, ConnectionState>,
    id: String,
    doc: String,
) -> eyre::Result<bool> {
    let pool = conn.pool().await?;
    super::is_conflicting(&pool, &id, &doc).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn upsert_outline(
    conn: State<'_, ConnectionState>,
    outline: Outline,
    y_updates: Vec<Base64Bytes>,
    link_list: HashSet<Link>,
    asset_list: HashSet<Asset>,
    new_asset_data: HashMap<String, Base64Bytes>,
) -> eyre::Result<()> {
    let pool = conn.pool().await?;
    let mut tx = pool.begin().await?;
    super::upsert_outline(&mut tx, &outline).await?;
    super::insert_y_updates(&mut *tx, &y_updates, &outline.id, outline.updated_at).await?;
    super::sync_links(&mut tx, &outline.id, link_list).await?;
    super::sync_assets(&mut tx, &outline.id, asset_list, new_asset_data).await?;
    tx.commit().await?;
    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn delete_outline(
    conn: State<'_, ConnectionState>,
    outline_id: String,
) -> eyre::Result<()> {
    let pool = conn.pool().await?;
    let mut tx = pool.begin().await?;
    super::delete_outline(&mut tx, &outline_id).await?;
    tx.commit().await?;
    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn clear_unreferenced_deleted_assets<'a>(app_handle: AppHandle) -> eyre::Result<()> {
    let conn = app_handle.state::<ConnectionState>();
    let pool = conn.pool().await?;
    let mut tx = pool.begin().await?;
    super::clear_unreferenced_deleted_assets(&mut tx).await?;
    tx.commit().await?;
    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn fetch_deleted_outline_trees(
    conn: State<'_, ConnectionState>,
    offset: i64,
) -> eyre::Result<Vec<Outline>> {
    let pool = conn.pool().await?;
    super::fetch_deleted_outline_trees(&pool, offset).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn clear_all_deleted_outlines(conn: State<'_, ConnectionState>) -> eyre::Result<()> {
    let pool = conn.pool().await?;
    let mut tx = pool.begin().await?;
    super::clear_all_deleted_outlines(&mut tx).await?;
    tx.commit().await?;
    eyre::Ok(())
}
