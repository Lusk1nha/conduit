//! Verifies the embedded `relay.db` migrations apply to a fresh database and
//! produce the expected schema.

use sqlx::sqlite::SqlitePoolOptions;

/// Migrations embedded at compile time from `crates/relay/migrations`.
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
    // max_connections(1) keeps the single in-memory database alive across the
    // migrate + assertion queries (each connection otherwise gets its own).
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("open in-memory sqlite");

    MIGRATOR.run(&pool).await.expect("run migrations");

    for table in ["webhook_routes", "webhook_events", "delivery_attempts"] {
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
    // Running again against an already-migrated database must be a no-op.
    MIGRATOR.run(&pool).await.expect("second run is a no-op");
}
