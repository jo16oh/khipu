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

    if let Some(id) = path.strip_prefix("y_updates?id=") {
        tokio::spawn(y_updates(responder, app_handle, id.to_string()));
    } else if let Some(id) = path.strip_prefix("assets?id=") {
        todo!();
    } else {
        responder.respond(
            Response::builder()
                .status(http::StatusCode::NOT_FOUND)
                .header(http::header::CONTENT_TYPE, "text/plain")
                .body("404 Not Found".as_bytes().to_vec())
                .unwrap(),
        );
    }
}

async fn y_updates<R: Runtime>(
    responder: UriSchemeResponder,
    app_handle: AppHandle<R>,
    id: String,
) -> eyre::Result<()> {
    let conn = app_handle.state::<ConnectionState>();
    let pool = conn.pool().await?;

    let updates = query::y_updates(&pool, &id).await?;
    let update = yrs::merge_updates_v2(updates)?;

    responder.respond(
        Response::builder()
            .status(200)
            .header("Content-Type", "arraybuffer")
            .header("Access-Control-Allow-Origin", "*")
            .body(update)?,
    );

    Ok(())
}
