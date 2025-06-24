use sqlx::migrate::MigrateDatabase;
use sqlx::{Sqlite, SqlitePool, migrate};
use std::path::PathBuf;
use tokio::runtime::Runtime;

fn main() {
    prepare_sqlx();
    tauri_build::build();
}

fn prepare_sqlx() {
    println!("cargo:rustc-env=DATABASE_URL=sqlite:.sqlx.graph");

    let url = ".sqlx.graph";

    if PathBuf::from(url).exists() {
        std::fs::remove_file(url).unwrap();
    }

    Runtime::new().unwrap().block_on(async {
        Sqlite::create_database(url).await.unwrap();
        let pool = SqlitePool::connect(url).await.unwrap();
        migrate!("./migrations").run(&pool).await.unwrap();
    });

    println!("cargo:rerun-if-changed=migrations/");
}
