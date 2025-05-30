use tauri::{
    AppHandle, Manager, Runtime, UriSchemeContext, UriSchemeResponder,
    http::{self, Request, Response},
};

use crate::db::{ConnectionState, query};

pub fn handle_request<R: Runtime>(
    ctx: UriSchemeContext<R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let path = &request.uri().path()[1..];
    let app_handle = ctx.app_handle().clone();

    if let Some(id) = path.strip_prefix("y_updates/") {
        tokio::spawn(y_updates(responder, app_handle, id.to_string()));
    } else if let Some(id) = path.strip_prefix("assets/") {
        tokio::spawn(asset(responder, app_handle, id.to_string()));
    } else {
        responder.respond(
            Response::builder()
                .status(http::StatusCode::NOT_FOUND)
                .body("404 Not Found".as_bytes().to_vec())
                .unwrap(),
        );
    }
}

async fn y_updates<R: Runtime>(
    responder: UriSchemeResponder,
    app_handle: AppHandle<R>,
    id: String,
) {
    let result = async {
        let conn = app_handle.state::<ConnectionState>();
        let pool = conn.pool().await?;
        let updates = query::y_updates(&pool, &id).await?;
        let update = yrs::merge_updates_v2(updates)?;
        eyre::Ok(update)
    }
    .await;

    match result {
        Ok(update) => responder.respond(
            Response::builder()
                .status(200)
                .header("Content-Type", "application/octet-stream")
                .header("Access-Control-Allow-Origin", "*")
                .body(update)
                .unwrap(),
        ),
        Err(err) => responder.respond(
            Response::builder()
                .status(http::StatusCode::BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body(err.to_string().into_bytes())
                .unwrap(),
        ),
    };
}

async fn asset<R: Runtime>(responder: UriSchemeResponder, app_handle: AppHandle<R>, id: String) {
    let result = async {
        let conn = app_handle.state::<ConnectionState>();
        let pool = conn.pool().await?;
        query::asset(&pool, &id).await
    }
    .await;

    match result {
        Ok(asset) => responder.respond(
            Response::builder()
                .status(200)
                .header("Content-Type", "application/octet-stream")
                .header("Access-Control-Allow-Origin", "*")
                .body(asset)
                .unwrap(),
        ),
        Err(err) => responder.respond(
            Response::builder()
                .status(http::StatusCode::BAD_REQUEST)
                .header("Content-Type", "text/plain")
                .body(err.to_string().into_bytes())
                .unwrap(),
        ),
    };
}
