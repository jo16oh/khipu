use std::path::PathBuf;

use crate::graph::ConnectionState;
use eyre::{OptionExt, bail};
use tauri::{AppHandle, Manager, State};

pub use super::query::commands::*;

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn create_graph(
    app_handle: AppHandle,
    conn: State<'_, ConnectionState>,
    graph_name: &str,
) -> eyre::Result<()> {
    let graphs_path = graphs_dir_path(&app_handle)?;

    let graph_path = graphs_path.join(graph_name.to_string() + ".sqlite3");
    if graph_path.exists() {
        bail!("A graph named `{}` already exists", graph_name);
    }

    let url = graph_path.to_str().ok_or_eyre("invalid sqlite url")?;
    conn.open(url).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn open_graph(
    app_handle: AppHandle,
    conn: State<'_, ConnectionState>,
    graph_name: &str,
) -> eyre::Result<()> {
    let graphs_path = graphs_dir_path(&app_handle)?;

    let graph_path = graphs_path.join(graph_name.to_string() + ".sqlite3");
    if !graph_path.exists() {
        bail!("Graph named `{}` not found", graph_name);
    }

    let url = graph_path.to_str().ok_or_eyre("invalid sqlite url")?;
    conn.open(url).await
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn close_graph(conn: State<'_, ConnectionState>) -> eyre::Result<()> {
    conn.close().await;
    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn delete_graph(
    app_handle: AppHandle,
    conn: State<'_, ConnectionState>,
    graph_name: String,
) -> eyre::Result<()> {
    conn.close().await;

    let graph_path = app_handle
        .path()
        .app_data_dir()?
        .join("graphs")
        .join(graph_name + ".sqlite3");

    if graph_path.exists() {
        std::fs::remove_file(graph_path)?;
    }

    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn rename_graph(
    app_handle: AppHandle,
    conn: State<'_, ConnectionState>,
    old_name: &str,
    new_name: &str,
) -> eyre::Result<()> {
    conn.close().await;

    let graphs_path = graphs_dir_path(&app_handle)?;

    let old_path = graphs_path.join(old_name.to_string() + ".sqlite3");
    let new_path = graphs_path.join(new_name.to_string() + ".sqlite3");

    if !old_path.exists() {
        bail!("Graph named `{}` not found", old_name);
    }

    if new_path.exists() {
        bail!("A graph named `{}` already exists", new_name);
    }

    std::fs::rename(old_path, new_path)?;

    eyre::Ok(())
}

#[tauri::command]
#[specta::specta]
#[macros::eyre_to_any]
#[macros::log_err]
pub async fn list_graph(app_handle: AppHandle) -> eyre::Result<Vec<String>> {
    let graphs_path = graphs_dir_path(&app_handle)?;

    let list: Vec<String> = std::fs::read_dir(graphs_path)?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.is_file() {
                path.file_name()
                    .and_then(|s| s.to_str())
                    .and_then(|s| s.strip_suffix(".sqlite3"))
                    .map(|s| s.to_owned())
            } else {
                None
            }
        })
        .collect();

    eyre::Ok(list)
}

fn graphs_dir_path(app_handle: &AppHandle) -> eyre::Result<PathBuf> {
    let path = app_handle.path().app_data_dir()?.join("graphs");

    if !path.exists() {
        std::fs::create_dir_all(&path)?;
    }

    eyre::Ok(path)
}
