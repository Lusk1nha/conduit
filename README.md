# ◈ Conduit

> Local-first developer environment orchestrator with secure webhook tunneling.

[![Rust](https://img.shields.io/badge/Rust-1.78+-orange?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?style=flat-square&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows-lightgrey?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)]()

---

## What is Conduit?

Conduit is a desktop application built with Tauri that gives developers a unified control plane for their local development environment. It orchestrates processes, Docker containers, and services — and bundles a secure reverse-SSH tunnel daemon that exposes local endpoints to the internet without paid third-party tools like ngrok.

The project is split into two independent binaries with clearly separated responsibilities:

**`conduit-app`** — The Tauri desktop UI. Manages workspaces, service definitions, health monitoring, real-time logs, and controls the lifecycle of the `relay` daemon as one of its managed processes.

**`relay`** — A standalone Rust daemon. Maintains a persistent reverse-SSH tunnel to a self-hosted VPS (Oracle Cloud free tier, Fly.io, etc.), receives incoming webhook requests, routes them to local services with retry logic, and persists an immutable event-sourced history of every delivery attempt.

---

## Why Conduit?

Every developer running a modern stack opens five terminal tabs on boot: one for the API, one for the frontend, one for the worker, one for Docker, one for ngrok. Context-switching between them to check logs, restart a crashed service, or replay a failed webhook is pure friction.

Conduit replaces those five tabs with a single desktop app. No cloud dependency, no per-seat pricing, no sensitive webhook payloads leaving your infrastructure.

---

## Core Features

**Workspace orchestration**
Define services once per project — binaries, Docker containers, or scripts. Start, stop, and restart everything from one place. Forge remembers which services belong to which project.

**Real-time observability**
Live log streaming from every managed process via Server-Sent Events. Color-coded by service, filterable, searchable.

**Webhook tunneling (Relay)**
The `relay` daemon opens a reverse-SSH tunnel to your own free VPS. External services (GitHub, Stripe, Twilio) point their webhooks at your public URL. Relay routes them to the right local port, retries on failure, and lets you replay any past request from the UI.

**Event-sourced webhook history**
Every webhook received is an immutable event. Every delivery attempt — success or failure — is appended to that event's log. You can replay, inspect payloads, and audit the full delivery timeline.

**Zero-cost infrastructure**
The only external dependency is a free-tier VPS running a single stateless Rust binary. No message broker, no cloud database, no paid tunnel service.

---

## Architecture Overview

```
conduit-app (Tauri)
├── React 19 + TypeScript UI
├── Tauri IPC commands → Rust core
└── Manages relay as a child process

relay (standalone daemon)
├── Reverse-SSH tunnel via russh → free VPS
├── HTTP server (Axum) receives inbound webhooks
├── tokio::mpsc delivery queue → routing workers
├── Retry + backoff logic
└── SQLite event log (append-only)

free VPS (Oracle Cloud / Fly.io)
└── relay-peer: stateless SSH proxy, ~100 lines of Rust
```

---

## Tech Stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Desktop shell    | Tauri 2.x                                                |
| Frontend         | React 19, TypeScript 5, Vite, Tailwind CSS v4, Shadcn/UI |
| State management | Zustand + TanStack Query                                 |
| Daemon           | Rust (Axum, tokio, russh, SQLx)                          |
| Database         | SQLite (local, embedded)                                 |
| Async messaging  | `tokio::mpsc` channels                                   |
| Live streaming   | Server-Sent Events (SSE)                                 |
| Architecture     | DDD + Clean Architecture + SOLID                         |
| Testing          | Integration tests + E2E (Playwright)                     |
| CI/CD            | GitHub Actions (Linux + Windows cross-compile)           |

---

## Repository Structure

```
conduit/
├── apps/
│   └── desktop/               # Tauri + React application
│       ├── src/               # React frontend (DDD-structured)
│       └── src-tauri/         # Rust Tauri core
├── crates/
│   ├── relay/                 # Standalone daemon binary
│   ├── relay-peer/            # VPS proxy binary (~100 lines)
│   └── shared/                # Shared domain types + traits
├── docs/
│   ├── ARCHITECTURE.md        # System architecture decisions
│   ├── SYSTEM_DESIGN.md       # Low-level design + data models
│   └── IDEAS.md               # Feature backlog + future directions
├── tests/
│   ├── integration/           # Cross-crate integration tests
│   └── e2e/                   # Playwright E2E tests
├── .github/
│   └── workflows/             # CI + release pipelines
├── Cargo.toml                 # Workspace manifest
├── package.json               # pnpm workspace root
└── turbo.json                 # Turborepo pipeline
```

---

## Development Roadmap

### Phase 1 — Foundation

- [ ] Monorepo setup (Cargo workspaces + pnpm + Turborepo)
- [ ] Shared domain types and error handling
- [ ] SQLite schema + migrations (SQLx)
- [ ] Basic Tauri shell with React routing

### Phase 2 — Process Orchestration

- [ ] Service definition model (binary, Docker, script)
- [ ] Process lifecycle manager (spawn, watch, kill)
- [ ] SSE log streaming from managed processes to UI
- [ ] Workspace persistence in SQLite

### Phase 3 — Relay Daemon

- [ ] Axum HTTP server receiving inbound webhooks
- [ ] `tokio::mpsc` delivery queue + routing workers
- [ ] Retry logic with exponential backoff
- [ ] Event-sourced SQLite log (append-only)

### Phase 4 — SSH Tunnel

- [ ] `russh` reverse tunnel to free VPS
- [ ] `relay-peer` stateless proxy binary
- [ ] Tunnel health monitoring + auto-reconnect
- [ ] Tauri IPC to start/stop/monitor the relay daemon

### Phase 5 — UI Polish + Testing

- [ ] Webhook history UI with payload inspector
- [ ] Replay interface
- [ ] Integration test suite
- [ ] E2E tests (Playwright)
- [ ] GitHub Actions: Linux `.AppImage` + Windows `.msi`

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) 1.78+
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (optional, for container management features)

### Run in development

```bash
# Install dependencies
pnpm install

# Start the desktop app (hot reload)
pnpm dev

# Run the relay daemon standalone
cargo run -p relay

# Run all tests
cargo test --workspace
pnpm test:e2e
```

---

## License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://github.com/Lusk1nha">Lucas Pedro da Hora</a></p>
