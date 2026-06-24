# Ideas & Backlog

This document captures feature ideas, technical explorations, and future directions for Conduit. Items here are not committed — they exist to be evaluated, refined, or discarded as the project evolves.

Items are grouped by theme and tagged with an effort estimate: `[S]` small (< 1 day), `[M]` medium (1–3 days), `[L]` large (3–7 days), `[XL]` exploratory (unknown).

---

## Core UX Improvements

**Service dependency ordering** `[M]`
Allow a service definition to declare that it depends on another service being in `Running` state before it starts. Useful for "start Postgres before the API" workflows. Implementation: topological sort of the dependency graph before issuing spawn commands.

**Service templates** `[S]`
Pre-built service definition templates for common stacks (Next.js dev server, NestJS, FastAPI, PostgreSQL via Docker, Redis via Docker). Reduces setup friction for new workspaces.

**Workspace import/export** `[S]`
Serialize a workspace definition (without sensitive data) to a shareable JSON or TOML file. A team can commit `conduit-workspace.toml` to their repo and import it with one click.

**Per-service environment variable editor** `[S]`
Visual editor for env vars with support for referencing a `.env` file on disk. Keeps secrets out of the SQLite database.

**Service health checks** `[M]`
Allow a service definition to declare a health check: an HTTP endpoint that must return 2xx before the service is considered `Running`. Downstream dependent services only start after this check passes.

---

## Relay Enhancements

**Webhook signature verification** `[M]`
For known providers (GitHub, Stripe, Twilio, Linear), verify the webhook signature before forwarding. Failed verification is logged as a `DeliveryAttempt` with `status = "SignatureRejected"` and the request is dropped. Protects against replay attacks from outside your own relay.

**Request transformation** `[L]`
Allow a route to define a transformation pipeline applied to the incoming request before forwarding: add/remove headers, rewrite the path, inject a static auth token. Useful for normalizing webhook payloads across providers.

**Conditional routing** `[M]`
Route the same inbound path to different local targets based on a header value or a JSON body field. Example: GitHub's `X-GitHub-Event` header routes `push` to the CI service and `pull_request` to the review bot.

**Webhook dashboard filters** `[S]`
Filter the webhook history by route, delivery status (all / succeeded / failed / exhausted), and time range. Add full-text search over the request body.

**Replay with modifications** `[M]`
When replaying a webhook, allow the user to edit the body or headers before re-sending. Useful for debugging handler logic without needing to re-trigger the original event.

**Webhook test sender** `[S]`
A form in the UI that sends a synthetic webhook to a selected route. Lets developers test new routes without needing an external service to trigger them.

---

## Tunnel & Networking

**Multi-tunnel support** `[L]`
Allow different workspaces to use different VPS endpoints. Each workspace defines its own `relay_config`. The relay daemon manages multiple SSH sessions concurrently.

**Tunnel connection metrics** `[S]`
Track tunnel uptime, reconnection count, and latency (round-trip ping to the VPS) and surface them in the UI. Useful for diagnosing unstable connections.

**Local HTTPS via mkcert** `[M]`
Automatically generate a locally-trusted TLS certificate using `mkcert` and serve the relay's local HTTP server over HTTPS. Some webhook providers require HTTPS even for development endpoints.

**Alternative transport: QUIC / P2P** `[XL]`
Explore replacing the reverse-SSH tunnel with a QUIC-based P2P tunnel (using `quinn`) that doesn't require a VPS at all. Uses a lightweight STUN/signaling server for hole-punching. Falls back to the SSH tunnel on symmetric NAT. Would be the most technically impressive variant of the tunneling subsystem.

---

## Developer Experience

**CLI companion (`conduit-cli`)** `[L]`
A command-line interface that talks to the relay daemon's HTTP API. Lets developers interact with Conduit from a terminal or scripts without opening the desktop app. Example commands:

```bash
conduit relay status
conduit webhooks list --route github
conduit webhooks replay <id>
conduit services start api
```

**Shell completions** `[S]`
Generate shell completions for `conduit-cli` (bash, zsh, fish) using `clap_complete`.

**Notification system** `[S]`
Native OS notifications (via `tauri-plugin-notification`) for key events: service crashed, webhook delivery exhausted, tunnel disconnected. Configurable per event type.

**Global search** `[M]`
`Cmd/Ctrl+K` command palette across workspaces, services, and webhook history. Allows quick navigation and actions without mouse interaction. Fits the terminal-aesthetic design direction.

---

## Observability

**Log persistence** `[M]`
Optionally persist service log output to rolling files in the workspace data directory. Currently logs are in-memory only (lost on restart). Persisted logs enable post-mortem debugging of crashed services.

**Structured log parsing** `[M]`
Detect structured log lines (JSON logs from `tracing-subscriber` or `pino`) and render them in a collapsible tree view instead of raw text. Makes high-volume logs from services like NestJS more readable.

**Metrics aggregation** `[L]`
Track per-service metrics: restart count, uptime, average CPU and memory (via `sysinfo` crate). Display as sparklines in the service card. No external metrics system — all in-process.

---

## Architecture Explorations

**CRDT-based workspace sync** `[XL]`
Use a CRDT (conflict-free replicated data type) library like `automerge-rs` to sync workspace configurations across machines without a central server. Each machine holds a full replica; sync happens peer-to-peer over the existing SSH tunnel. Replaces the current "manual export/import" idea with automatic background sync.

**Plugin system** `[XL]`
Allow third-party service definitions and route transformers to be loaded as WASM plugins. The plugin interface is defined as a set of traits that WASM modules implement. Opens the door to community-contributed integrations without modifying the core binary.

**`relay` as a library crate** `[M]`
Expose the relay's core (webhook routing, retry logic, event sourcing) as a library crate (`relay-core`) in addition to the binary. Allows embedding the relay behavior directly in other Rust applications. The daemon binary becomes a thin wrapper over `relay-core`.

---

## Testing & Quality

**Property-based tests for delivery retry logic** `[M]`
Use `proptest` to generate arbitrary sequences of delivery outcomes (success, various failure modes, network interruptions) and verify that the state machine transitions are always valid and the event log is always consistent.

**Chaos testing for the tunnel** `[L]`
Write integration tests that simulate network interruptions at various points in the SSH tunnel lifecycle (during handshake, during data transfer, during reconnection backoff) and verify that the daemon recovers correctly and never loses a queued webhook.

**Load test for the delivery queue** `[M]`
Benchmark the delivery queue under high inbound webhook volume (1000+ requests/second) to characterize backpressure behavior and identify bottlenecks. Use `criterion` for micro-benchmarks and a custom load test harness for the full pipeline.

---

## Release & Distribution

**Auto-update** `[M]`
Implement in-app auto-update via `tauri-plugin-updater`. On launch, check a GitHub releases endpoint for a newer version. If found, download and install in the background with a notification.

**Homebrew tap** `[S]`
Publish a Homebrew formula (for macOS, if support is added later) and a Nix flake. Makes installation one command for developers who prefer package managers over GUI installers.

**`relay-peer` one-line deploy script** `[S]`
A shell script that SSHs into a fresh Ubuntu VPS, installs the `relay-peer` binary, creates a dedicated `conduit` user with a restricted shell, and configures `systemd` to run it on boot. Lowers the barrier to setting up the VPS side.

---

## Rejected Ideas

These were considered and explicitly ruled out. Documented here to avoid revisiting them.

**RabbitMQ / NATS as the delivery queue**
Rejected: `tokio::mpsc` is sufficient for a single-process queue. Adding a message broker introduces an external dependency, operational overhead, and complexity with no benefit at this scale.

**Redis for caching**
Rejected: The relay is a single-process daemon. In-memory Rust structures serve as the cache. Persistence goes directly to SQLite.

**Qdrant for semantic search over webhooks**
Rejected: There is no semantic search use case in this project. Qdrant was used in Nexus Helpdesk for RAG — applying it here would be cargo-culting.

**Multi-tenant architecture**
Rejected: Conduit is a developer tool. It runs on one machine, used by one developer. Multi-tenancy adds isolation complexity with no user benefit.

**macOS as a primary target**
Rejected for now: Distributing a signed Tauri app on macOS requires an Apple Developer account ($99/year) and notarization. Without a Mac to test and sign on, this is deferred indefinitely. The codebase will remain macOS-compatible — just not distributed.
