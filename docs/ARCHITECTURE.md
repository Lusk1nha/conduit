# Architecture

This document describes the high-level architectural decisions for Conduit, the reasoning behind each choice, and the boundaries between components.

---

## Guiding Principles

Every architectural decision in this project is guided by four rules:

1. **Boundaries before features.** A domain that doesn't know about its infrastructure can be tested, replaced, or extended without breaking everything around it.
2. **Right tool for the scale.** A `tokio::mpsc` channel is not "worse" than RabbitMQ — it is the correct choice when the producer and consumer live in the same process.
3. **Fail explicitly.** Errors are domain values, not exceptions. Every operation that can fail returns a `Result`. Panics are reserved for programmer errors, not runtime conditions.
4. **Code in English, think in context.** All code, comments, types, and documentation are in English. Domain language comes from the problem domain, not from the implementation language.

---

## System Overview

Conduit is composed of three independently deployable binaries that communicate over well-defined protocols.

```
┌─────────────────────────────────────┐
│         conduit-app (Tauri)         │
│                                     │
│  React UI ──IPC──▶ Rust Core        │
│                       │             │
│                  Tauri Commands     │
└───────────────────────┼─────────────┘
                        │ spawn + IPC
                        ▼
┌─────────────────────────────────────┐
│           relay (daemon)            │
│                                     │
│  Axum HTTP ──mpsc──▶ DeliveryWorker │
│       │                   │         │
│  SSH Tunnel            SQLite log   │
└───────┼─────────────────────────────┘
        │ reverse SSH
        ▼
┌─────────────────────────────────────┐
│         relay-peer (VPS)            │
│   stateless SSH proxy — port fwd    │
└─────────────────────────────────────┘
```

---

## Binary Responsibilities

### `conduit-app`

The desktop application. Its Rust core is responsible for:

- Spawning and monitoring child processes (services defined by the user)
- Communicating with the `relay` daemon via local HTTP + SSE
- Persisting workspace and service configuration to a local SQLite database
- Exposing Tauri IPC commands consumed by the React frontend

The React frontend is responsible for:

- Rendering service health, logs, and webhook history
- Accepting user input for workspace and service configuration
- Displaying tunnel status and the webhook request inspector

The `conduit-app` does not implement any webhook routing logic. That belongs entirely to `relay`.

### `relay`

The standalone daemon. It is designed to run both as a child process managed by `conduit-app` and as a standalone binary for headless environments. Its responsibilities:

- Open and maintain a reverse-SSH tunnel to a configured VPS via `russh`
- Accept inbound HTTP webhook requests on a local port
- Push received webhooks onto an internal `tokio::mpsc` channel
- A pool of delivery workers consumes the channel, attempts to forward each webhook to its configured local target, and applies retry logic on failure
- Persist every received webhook and every delivery attempt as an immutable event to SQLite
- Expose a local HTTP API (Axum) for `conduit-app` to query webhook history and trigger replays
- Expose a local SSE endpoint for `conduit-app` to stream live delivery events

The `relay` daemon has no knowledge of the Tauri UI. It is a pure backend service.

### `relay-peer`

A minimal Rust binary deployed to a free-tier VPS (Oracle Cloud, Fly.io). Its only responsibility is to accept an incoming SSH connection from `relay` and forward inbound TCP traffic on a public port through that connection to the daemon's local Axum server. It is stateless — no database, no configuration beyond the listening port and authorized public key.

---

## Clean Architecture Layers

Each crate follows the same layer structure. Dependencies point inward — outer layers know about inner layers, never the reverse.

```
┌────────────────────────────────────┐
│  Infrastructure                    │  SQLite repos, Axum handlers,
│  (outermost)                       │  SSH client, HTTP client, SSE
├────────────────────────────────────┤
│  Application                       │  Use cases, command/query handlers,
│                                    │  port interfaces (traits)
├────────────────────────────────────┤
│  Domain                            │  Entities, value objects, domain
│  (innermost)                       │  events, aggregate roots, errors
└────────────────────────────────────┘
```

The domain layer has zero dependencies on external crates beyond the standard library and basic utilities (`uuid`, `chrono`, `thiserror`). It never imports `axum`, `sqlx`, `russh`, or any I/O primitive.

---

## Domain Model

### `conduit-app` domain

**Workspace** — aggregate root. Represents a developer project. Contains a collection of `ServiceDefinition` value objects. Has a unique `WorkspaceId` and a human-readable `slug`.

**ServiceDefinition** — value object. Describes how to run a single service: kind (`Binary`, `Docker`, `Script`), entry point, environment variables, working directory, and port assignments.

**ServiceInstance** — entity. Represents a running instance of a `ServiceDefinition`. Has a `ServiceInstanceId`, a `ProcessId`, a `ServiceStatus` (`Starting`, `Running`, `Stopping`, `Stopped`, `Crashed`), and a bounded log buffer.

**RelayStatus** — value object. A snapshot of the relay daemon's current state: tunnel connectivity, active route count, and last heartbeat timestamp.

### `relay` domain

**WebhookRoute** — entity. Maps an inbound path pattern to a local target URL. Has a `RouteId` and belongs to a `WorkspaceId`.

**WebhookEvent** — aggregate root. Represents a single received webhook. Immutable after creation. Has a `WebhookEventId`, captured headers, body, source IP, received timestamp, and a `RouteId`.

**DeliveryAttempt** — entity. Appended to a `WebhookEvent`. Records one forwarding attempt: target URL, HTTP status returned (or transport error), response body, attempt number, and timestamp. Never mutated after insertion.

**TunnelConnection** — entity. Represents the current SSH tunnel state: `Disconnected`, `Connecting`, `Connected { public_url }`, `Reconnecting { attempt, backoff_until }`.

---

## Key Design Patterns

### Repository pattern

Every aggregate root has a corresponding repository trait defined in the application layer. The infrastructure layer provides the SQLite implementation. Use cases depend only on the trait.

```rust
// application layer — pure trait, no I/O
pub trait WebhookEventRepository: Send + Sync {
    async fn save(&self, event: &WebhookEvent) -> Result<(), RepositoryError>;
    async fn find_by_id(&self, id: &WebhookEventId) -> Result<Option<WebhookEvent>, RepositoryError>;
    async fn list_by_route(&self, route_id: &RouteId, limit: u32) -> Result<Vec<WebhookEvent>, RepositoryError>;
}

// infrastructure layer — concrete SQLite implementation
pub struct SqliteWebhookEventRepository { pool: SqlitePool }

impl WebhookEventRepository for SqliteWebhookEventRepository { ... }
```

### Command / Query separation (CQRS-lite)

Use cases are split into commands (write) and queries (read). Commands return `Result<(), DomainError>`. Queries return `Result<T, QueryError>`. They can use different repository implementations if needed — the same SQLite database serves both, but the separation keeps intent explicit.

### Event sourcing (relay delivery log)

The delivery history in `relay` is append-only. `WebhookEvent` and its `DeliveryAttempt` children are never updated or deleted. This gives replay for free — reconstructing the full history of any webhook means reading its event row and all associated attempt rows in insertion order.

### Domain events

Domain operations emit domain events (e.g., `WebhookReceived`, `DeliverySucceeded`, `DeliveryFailed`, `TunnelConnected`). These are published on an internal `tokio::broadcast` channel. The SSE handler subscribes to this channel and streams events to `conduit-app`. This decouples the delivery worker from the observability layer entirely.

### Error handling

Errors are modeled as domain values using `thiserror`. Each layer defines its own error type. Infrastructure errors are mapped to domain errors at the boundary — a `sqlx::Error` never leaks into the application layer.

```rust
#[derive(Debug, thiserror::Error)]
pub enum DeliveryError {
    #[error("target service returned {status}")]
    HttpError { status: u16 },
    #[error("connection to target refused")]
    ConnectionRefused,
    #[error("delivery timed out after {elapsed_ms}ms")]
    Timeout { elapsed_ms: u64 },
}
```

---

## Concurrency Model

### relay daemon

The daemon is entirely async, built on `tokio`. The concurrency topology is:

```
Axum HTTP handler
    │
    ▼ tokio::mpsc::Sender<WebhookDeliveryTask>
DeliveryQueue (bounded channel, capacity = 1024)
    │
    ▼ tokio::mpsc::Receiver<WebhookDeliveryTask>
DeliveryWorkerPool (N workers, configurable)
    │
    ├─▶ attempt HTTP forward to local target
    ├─▶ on failure: schedule retry via tokio::time::sleep + re-enqueue
    └─▶ append DeliveryAttempt to SQLite
    │
    ▼ tokio::broadcast::Sender<DomainEvent>
SSE handler (fan-out to all connected UI clients)
```

The channel is bounded to apply natural backpressure. If the queue is full (e.g., the local target is down and all retries are pending), the HTTP handler returns `429 Too Many Requests` to the inbound webhook sender.

### SSH tunnel

The tunnel is managed by a dedicated `tokio::task` that owns the `russh` session. It communicates with the rest of the daemon via a `TunnelCommandSender` channel, accepting `Connect`, `Disconnect`, and `GetStatus` commands. This isolates reconnection logic and prevents tunnel errors from propagating into the delivery path.

---

## Data Storage

Both `conduit-app` and `relay` use SQLite via SQLx with compile-time verified queries. There is no shared database — each binary owns its own `.db` file stored in the OS application data directory.

**`conduit-app` database**

- `workspaces` — workspace definitions
- `service_definitions` — service configs per workspace
- `service_instances` — ephemeral instance state (cleared on restart)

**`relay` database**

- `webhook_routes` — route definitions (path → target)
- `webhook_events` — immutable received webhook records
- `delivery_attempts` — append-only delivery attempt log per event

SQLx migrations run automatically on startup via `sqlx::migrate!()`.

---

## Inter-Process Communication

`conduit-app` communicates with `relay` over localhost HTTP. The relay daemon exposes:

- `GET /health` — liveness check
- `GET /events` — SSE stream of domain events
- `GET /webhooks` — paginated webhook history
- `POST /webhooks/{id}/replay` — trigger a replay
- `GET /routes` — list active routes
- `POST /routes` — create a route
- `DELETE /routes/{id}` — remove a route
- `GET /tunnel/status` — current tunnel connection state

Tauri IPC is used for the React → Rust boundary inside `conduit-app`. Tauri commands are thin wrappers that delegate immediately to application-layer use cases.

---

## Testing Strategy

### Unit tests

Domain entities and value objects are tested in isolation. No I/O, no async, no mocks. Tests live in the same file as the code (`#[cfg(test)]` modules).

### Integration tests

Use case tests exercise the full application layer with an in-memory or temporary-file SQLite database. The infrastructure implementations are real — only the network boundary (SSH, outbound HTTP) is replaced with test doubles behind the repository/port traits.

### End-to-end tests

Playwright drives the Tauri UI against a real `relay` daemon pointed at a local test HTTP server. These tests live in `tests/e2e/` and run in CI against the Linux build.

---

## CI/CD

GitHub Actions runs on every pull request and push to `main`:

- `cargo test --workspace` — all Rust unit + integration tests
- `cargo clippy --workspace -- -D warnings` — zero lint warnings enforced
- `pnpm type-check` — TypeScript strict mode
- `pnpm test:e2e` — Playwright E2E suite (Linux runner)

On tagged releases, a separate workflow cross-compiles and produces:

- `conduit_linux_x86_64.AppImage`
- `conduit_linux_x86_64.deb`
- `conduit_windows_x86_64.msi`
