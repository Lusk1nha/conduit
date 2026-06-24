# System Design

This document covers the low-level design decisions for Conduit: data schemas, API contracts, state machines, retry behavior, and configuration.

---

## Monorepo Layout

```
conduit/
├── apps/
│   └── desktop/                      # Tauri application
│       ├── src/                      # React frontend
│       │   ├── domain/               # Frontend entities + value objects
│       │   ├── application/          # Use cases (hooks + services)
│       │   ├── infrastructure/       # Tauri IPC adapters, API clients
│       │   └── presentation/         # Pages, components, contexts
│       ├── src-tauri/                # Rust Tauri core
│       │   ├── src/
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── infrastructure/
│       │   │   └── commands/         # Tauri IPC command handlers
│       │   └── Cargo.toml
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── crates/
│   ├── relay/                        # Standalone daemon
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── main.rs
│   │   └── Cargo.toml
│   ├── relay-peer/                   # VPS proxy (~100 lines)
│   │   ├── src/
│   │   │   └── main.rs
│   │   └── Cargo.toml
│   └── shared/                       # Shared types + traits
│       ├── src/
│       │   ├── domain/               # Shared value objects (IDs, errors)
│       │   └── lib.rs
│       └── Cargo.toml
│
├── tests/
│   ├── integration/                  # Cross-crate integration tests
│   └── e2e/                          # Playwright E2E tests
│       ├── fixtures/
│       ├── specs/
│       └── playwright.config.ts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # PR checks
│       └── release.yml               # Tagged release builds
│
├── Cargo.toml                        # [workspace] manifest
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Database Schemas

### `conduit-app` — `conduit.db`

```sql
CREATE TABLE workspaces (
    id          TEXT PRIMARY KEY,           -- UUIDv7
    slug        TEXT NOT NULL UNIQUE,       -- e.g. "my-project"
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,              -- ISO 8601
    updated_at  TEXT NOT NULL
);

CREATE TABLE service_definitions (
    id              TEXT PRIMARY KEY,       -- UUIDv7
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    kind            TEXT NOT NULL,          -- "Binary" | "Docker" | "Script"
    entry_point     TEXT NOT NULL,          -- binary path, image name, or script path
    args            TEXT NOT NULL,          -- JSON array of strings
    env_vars        TEXT NOT NULL,          -- JSON object { KEY: VALUE }
    working_dir     TEXT,
    port            INTEGER,
    auto_start      INTEGER NOT NULL DEFAULT 0,   -- boolean
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE relay_configs (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    vps_host        TEXT NOT NULL,
    vps_port        INTEGER NOT NULL DEFAULT 22,
    vps_user        TEXT NOT NULL DEFAULT "conduit",
    public_port     INTEGER NOT NULL,
    private_key_path TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
```

### `relay` — `relay.db`

```sql
CREATE TABLE webhook_routes (
    id              TEXT PRIMARY KEY,       -- UUIDv7
    workspace_id    TEXT NOT NULL,
    path_pattern    TEXT NOT NULL,          -- e.g. "/github"
    target_url      TEXT NOT NULL,          -- e.g. "http://localhost:3000/webhooks/github"
    description     TEXT,
    enabled         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE(workspace_id, path_pattern)
);

CREATE TABLE webhook_events (
    id              TEXT PRIMARY KEY,       -- UUIDv7
    route_id        TEXT NOT NULL REFERENCES webhook_routes(id),
    method          TEXT NOT NULL,          -- "POST" | "PUT" | etc.
    path            TEXT NOT NULL,
    headers         TEXT NOT NULL,          -- JSON object
    body            TEXT,                   -- raw body (nullable for GET)
    source_ip       TEXT NOT NULL,
    received_at     TEXT NOT NULL           -- ISO 8601, immutable
);

CREATE TABLE delivery_attempts (
    id              TEXT PRIMARY KEY,       -- UUIDv7
    event_id        TEXT NOT NULL REFERENCES webhook_events(id),
    attempt_number  INTEGER NOT NULL,
    target_url      TEXT NOT NULL,
    status          TEXT NOT NULL,          -- "Success" | "HttpError" | "ConnectionRefused" | "Timeout"
    http_status     INTEGER,                -- null if transport-level error
    response_body   TEXT,
    elapsed_ms      INTEGER NOT NULL,
    attempted_at    TEXT NOT NULL           -- ISO 8601, immutable
);

CREATE INDEX idx_webhook_events_route_id ON webhook_events(route_id);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX idx_delivery_attempts_event_id ON delivery_attempts(event_id);
```

---

## State Machines

### `ServiceStatus`

Governs the lifecycle of a managed process.

```
              spawn()
[Stopped] ──────────────▶ [Starting]
    ▲                          │
    │                    process ready
    │                          │
    │                          ▼
  stop()              ┌──── [Running]
    │                 │         │
    │             crash         │ stop()
    │                 │         ▼
    │                 └──▶ [Stopping]
    │                          │
    └──────────────────────────┘
                           process exits
                               │
                               ▼
                         [Stopped | Crashed]
```

Transitions are driven by OS process events (`tokio::process::Child` exit status) and user commands from the Tauri IPC layer. The state is persisted in memory only — `service_instances` in SQLite is cleared on application startup.

### `TunnelConnectionState`

Governs the relay daemon's SSH tunnel lifecycle.

```
[Disconnected]
      │
      │ connect()
      ▼
[Connecting]
      │
      ├── success ──▶ [Connected { public_url }]
      │                       │
      │               connection lost
      │                       │
      └── failure ────▶ [Reconnecting { attempt, backoff_until }]
                                │
                                │ backoff elapsed
                                ▼
                          [Connecting]  (loop)
                                │
                          max attempts reached
                                │
                                ▼
                         [Disconnected]
```

Reconnection uses exponential backoff with jitter:

```
backoff_ms = min(base_ms * 2^attempt, max_ms) + random_jitter_ms
```

Where `base_ms = 1000`, `max_ms = 60_000`, `jitter = rand(0..1000)`.

### `DeliveryStatus`

Governs the outcome of a single delivery attempt.

```
[Pending]
    │
    │ worker picks up task
    ▼
[Delivering]
    │
    ├── HTTP 2xx ──────────────▶ [Succeeded]
    │
    ├── HTTP 4xx/5xx ──────────▶ [Failed { retryable: false }]
    │   (4xx are not retried — bad route config)
    │
    └── transport error ───────▶ [Failed { retryable: true }]
        (connection refused,          │
         timeout, DNS failure)        │ attempt < max_attempts
                                      ▼
                               [Pending] (re-enqueued with backoff)
                                      │
                               attempt == max_attempts
                                      ▼
                               [Exhausted]
```

Maximum delivery attempts: 5. Backoff schedule (seconds): `[1, 5, 15, 30, 60]`.

---

## Relay HTTP API

All endpoints are served on `127.0.0.1:42800` by default (configurable).

### Health

```
GET /health
→ 200 { "status": "ok", "version": "0.1.0" }
```

### Domain events (SSE)

```
GET /events
→ 200 text/event-stream

Event types:
  webhook.received        { event_id, route_id, method, path, received_at }
  delivery.attempted      { attempt_id, event_id, attempt_number, status, elapsed_ms }
  delivery.succeeded      { attempt_id, event_id }
  delivery.failed         { attempt_id, event_id, retryable }
  delivery.exhausted      { event_id }
  tunnel.connected        { public_url }
  tunnel.disconnected     {}
  tunnel.reconnecting     { attempt, backoff_until }
```

### Webhooks

```
GET /webhooks?route_id=&limit=50&before=<cursor>
→ 200 { "items": [WebhookEvent], "next_cursor": "..." | null }

GET /webhooks/:id
→ 200 WebhookEvent (with delivery_attempts embedded)
→ 404

POST /webhooks/:id/replay
→ 202 { "task_id": "..." }
→ 404
→ 409 (already pending replay)
```

### Routes

```
GET /routes
→ 200 { "items": [WebhookRoute] }

POST /routes
body: { "path_pattern": "/github", "target_url": "http://localhost:3000/webhooks/github", "description": "..." }
→ 201 WebhookRoute
→ 409 (path_pattern conflict)
→ 422 (validation error)

PATCH /routes/:id
body: { "target_url"?: "...", "description"?: "...", "enabled"?: true }
→ 200 WebhookRoute
→ 404

DELETE /routes/:id
→ 204
→ 404
```

### Tunnel

```
GET /tunnel/status
→ 200 { "state": "Connected" | "Disconnected" | "Connecting" | "Reconnecting", "public_url": "..." | null, "attempt": 0 }

POST /tunnel/connect
→ 202
→ 409 (already connecting or connected)

POST /tunnel/disconnect
→ 202
→ 409 (already disconnected)
```

---

## Tauri IPC Commands

Commands are defined in `src-tauri/src/commands/`. Each command is a thin wrapper over an application-layer use case.

```rust
// Workspace commands
#[tauri::command] create_workspace(name: String, slug: String) -> Result<Workspace, CommandError>
#[tauri::command] list_workspaces() -> Result<Vec<Workspace>, CommandError>
#[tauri::command] delete_workspace(id: String) -> Result<(), CommandError>

// Service commands
#[tauri::command] create_service(workspace_id: String, definition: ServiceDefinitionInput) -> Result<ServiceDefinition, CommandError>
#[tauri::command] list_services(workspace_id: String) -> Result<Vec<ServiceDefinition>, CommandError>
#[tauri::command] start_service(definition_id: String) -> Result<ServiceInstanceSummary, CommandError>
#[tauri::command] stop_service(instance_id: String) -> Result<(), CommandError>
#[tauri::command] get_service_status(instance_id: String) -> Result<ServiceStatus, CommandError>

// Relay commands
#[tauri::command] start_relay(workspace_id: String) -> Result<(), CommandError>
#[tauri::command] stop_relay() -> Result<(), CommandError>
#[tauri::command] get_relay_status() -> Result<RelayStatus, CommandError>
```

Live events (log lines, service status changes, relay events) are pushed from Rust to the React frontend via Tauri's event system (`app_handle.emit()`), not via polling commands.

---

## Frontend Architecture (React)

The frontend follows the same DDD layering as the Rust backend.

```
src/
├── domain/
│   ├── workspace/
│   │   ├── Workspace.ts              # entity
│   │   └── WorkspaceErrors.ts
│   ├── service/
│   │   ├── ServiceDefinition.ts
│   │   ├── ServiceInstance.ts
│   │   └── ServiceStatus.ts
│   └── relay/
│       ├── WebhookRoute.ts
│       ├── WebhookEvent.ts
│       └── TunnelStatus.ts
├── application/
│   ├── workspace/
│   │   ├── useCreateWorkspace.ts
│   │   └── useListWorkspaces.ts
│   ├── service/
│   │   ├── useStartService.ts
│   │   └── useServiceLogs.ts         # subscribes to Tauri events
│   └── relay/
│       ├── useRelayStatus.ts
│       └── useWebhookHistory.ts
├── infrastructure/
│   ├── tauri/
│   │   ├── TauriWorkspaceRepository.ts
│   │   └── TauriServiceRepository.ts
│   └── relay-api/
│       ├── RelayApiClient.ts         # HTTP client for relay daemon
│       └── RelayEventSource.ts       # SSE subscription
└── presentation/
    ├── pages/
    │   ├── WorkspacePage.tsx
    │   ├── ServicesPage.tsx
    │   └── RelayPage.tsx
    ├── components/
    │   ├── ServiceCard.tsx
    │   ├── LogViewer.tsx
    │   └── WebhookInspector.tsx
    └── router.tsx
```

---

## Configuration

Both binaries read configuration from a TOML file located in the OS application data directory.

### `conduit-app` — `conduit.toml`

```toml
[app]
log_level = "info"           # trace | debug | info | warn | error

[relay]
port = 42800                 # local port the relay daemon listens on
auto_start = false           # start relay automatically with the app
```

### `relay` — `relay.toml`

```toml
[server]
host = "127.0.0.1"
port = 42800

[tunnel]
vps_host = ""                # set by conduit-app before spawning
vps_port = 22
vps_user = "conduit"
public_port = 0
private_key_path = ""

[delivery]
worker_count = 4
queue_capacity = 1024
max_attempts = 5
backoff_schedule_secs = [1, 5, 15, 30, 60]
request_timeout_secs = 10

[database]
path = ""                    # defaults to OS app data dir
```

---

## Shared Types (`crates/shared`)

The `shared` crate defines types used by both `relay` and the Tauri core to avoid duplication.

```rust
// Strongly-typed IDs using the newtype pattern
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct WorkspaceId(Uuid);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct WebhookEventId(Uuid);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RouteId(Uuid);

// All IDs use UUIDv7 for time-ordered generation
impl WorkspaceId {
    pub fn new() -> Self { Self(Uuid::now_v7()) }
}

// Common error base
#[derive(Debug, thiserror::Error)]
pub enum ConduitError {
    #[error("not found: {entity} with id {id}")]
    NotFound { entity: &'static str, id: String },
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("internal: {0}")]
    Internal(#[from] anyhow::Error),
}
```

---

## Testing Approach

### Rust unit tests

```rust
// domain/webhook_event.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_event_has_no_delivery_attempts() {
        let event = WebhookEvent::new(
            RouteId::new(),
            "POST".into(),
            "/github".into(),
            HeaderMap::new(),
            Some(b"{}".to_vec()),
            "1.2.3.4".parse().unwrap(),
        );
        assert!(event.delivery_attempts().is_empty());
        assert_eq!(event.status(), DeliveryStatus::Pending);
    }
}
```

### Rust integration tests

```rust
// tests/integration/relay_delivery_test.rs
#[tokio::test]
async fn webhook_is_delivered_to_local_target() {
    let db = setup_test_db().await;
    let target = MockHttpServer::start().await;        // local mock server
    let route = create_test_route(&db, target.url()).await;

    let use_case = DeliverWebhookUseCase::new(
        SqliteWebhookEventRepository::new(db.clone()),
        HttpDeliveryClient::new(),
    );

    let event = WebhookEvent::new(route.id().clone(), /* ... */);
    use_case.execute(&event).await.unwrap();

    let recorded = target.requests_received();
    assert_eq!(recorded.len(), 1);
    assert_eq!(recorded[0].path(), "/webhooks/github");
}
```

### E2E tests (Playwright)

```typescript
// tests/e2e/specs/webhook-replay.spec.ts
test("user can replay a failed webhook", async ({ page }) => {
  await page.goto("/relay");
  await page.getByTestId("webhook-list").waitFor();

  const firstRow = page.getByTestId("webhook-row").first();
  await firstRow.getByRole("button", { name: "Replay" }).click();

  await expect(page.getByTestId("delivery-status")).toHaveText("Delivered");
});
```

---

## Dependency List

### Rust (`Cargo.toml` workspace)

```toml
[workspace.dependencies]
# async runtime
tokio = { version = "1", features = ["full"] }

# web framework
axum = { version = "0.7", features = ["macros"] }

# SSH tunneling
russh = "0.44"

# database
sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio", "macros", "uuid", "chrono"] }

# serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# IDs
uuid = { version = "1", features = ["v7"] }

# time
chrono = { version = "0.4", features = ["serde"] }

# error handling
thiserror = "1"
anyhow = "1"

# config
toml = "0.8"

# HTTP client (for delivery)
reqwest = { version = "0.12", features = ["json"] }

# logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

### Frontend (`package.json`)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-sql": "^2",
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "zustand": "^5",
    "@tanstack/react-query": "^5",
    "tailwindcss": "^4",
    "@shadcn/ui": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "@playwright/test": "^1.44"
  }
}
```
