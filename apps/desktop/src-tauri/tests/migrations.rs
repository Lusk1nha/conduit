//! Verifies the embedded `conduit.db` migrations apply to a fresh database and
//! produce the expected schema.

use sqlx::sqlite::SqlitePoolOptions;

/// Migrations embedded at compile time from `apps/desktop/src-tauri/migrations`.
static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

async fn table_exists(pool: &sqlx::SqlitePool, name: &str) -> bool {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?")
            .bind(name)
            .fetch_one(pool)
            .await
            .expect("query sqlite_master");
    count == 1
}

#[tokio::test]
async fn migrations_apply_and_create_schema() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("open in-memory sqlite");

    MIGRATOR.run(&pool).await.expect("run migrations");

    for table in ["workspaces", "service_definitions", "relay_configs"] {
        assert!(table_exists(&pool, table).await, "missing table {table}");
    }
}

#[tokio::test]
async fn migrations_are_idempotent() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("open in-memory sqlite");

    MIGRATOR.run(&pool).await.expect("first run");
    MIGRATOR.run(&pool).await.expect("second run is a no-op");
}
