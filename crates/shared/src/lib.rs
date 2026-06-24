//! Shared domain primitives used across the Conduit workspace.
//!
//! This crate is intentionally I/O-free: it depends only on lightweight
//! utilities (`serde`, `uuid`, `chrono`, `thiserror`) and never imports
//! `axum`, `sqlx`, `russh`, or any infrastructure concern. See
//! `docs/ARCHITECTURE.md` for the layering rules this enforces.
//!
//! It provides three things shared by both `relay` and the `conduit-app` core:
//! - [`ids`] — strongly-typed, time-ordered identifiers.
//! - [`error`] — the [`ConduitError`] base type every layer maps into.
//! - [`status`] — status enums that cross the HTTP/IPC boundary.

pub mod error;
pub mod ids;
pub mod status;

pub use error::{ConduitError, ConduitResult};
pub use ids::{
    DeliveryAttemptId, RouteId, ServiceDefinitionId, ServiceInstanceId, WebhookEventId, WorkspaceId,
};
pub use status::{DeliveryStatus, ServiceKind, ServiceStatus, TunnelState};
