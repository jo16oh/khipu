mod commands;
mod custom_protocol;
mod db;
mod error;
mod model;
mod util;

use db::ConnectionState;
use specta_typescript::Typescript;
use tauri::{Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let specta_builder = get_specta_builder();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all() - StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app| {
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .hidden_title(true)
                .inner_size(1025.0, 800.0)
                .min_inner_size(470.0, 380.0)
                .resizable(true)
                .visible(true);

            // set transparent title bar only when building for macOS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Overlay);

            win_builder.build()?;

            // initialize connection state
            app.manage(ConnectionState::new());

            let app_handle = app.app_handle().clone();
            tokio::spawn(commands::clear_unreferenced_assets_in_trashbox(app_handle));

            Ok(())
        })
        .register_asynchronous_uri_scheme_protocol("bin", custom_protocol::handle_request)
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    specta_builder.mount_events(&app);

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            app_handle.save_window_state(StateFlags::all()).unwrap();
        }
    });
}

fn get_specta_builder() -> tauri_specta::Builder {
    let builder = tauri_specta::Builder::new()
        .commands(commands::commands())
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default().bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/generated/tauri-commands.ts",
        )
        .expect("Failed to export typescript bindings");

    builder
}

#[cfg(test)]
mod test {
    use super::*;

    // export specta types while running tests
    #[test]
    fn export_specta() {
        get_specta_builder();
    }
}
