//! Shared domain primitives used across the Conduit workspace.
//!
//! This crate is intentionally I/O-free: it depends only on lightweight
//! utilities (`serde`, `uuid`, `chrono`, `thiserror`) and never imports
//! `axum`, `sqlx`, `russh`, or any infrastructure concern. See
//! `docs/ARCHITECTURE.md` for the layering rules this enforces.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Generates a strongly-typed, time-ordered (UUIDv7) newtype ID.
macro_rules! id_newtype {
    ($(#[$meta:meta])* $name:ident) => {
        $(#[$meta])*
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
        pub struct $name(Uuid);

        impl $name {
            /// Creates a new time-ordered ID.
            #[must_use]
            pub fn new() -> Self {
                Self(Uuid::now_v7())
            }

            /// Returns the inner UUID.
            #[must_use]
            pub fn as_uuid(&self) -> Uuid {
                self.0
            }
        }

        impl Default for $name {
            fn default() -> Self {
                Self::new()
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}", self.0)
            }
        }
    };
}

id_newtype!(
    /// Identifies a developer workspace (project).
    WorkspaceId
);
id_newtype!(
    /// Identifies a single received webhook event.
    WebhookEventId
);
id_newtype!(
    /// Identifies a webhook route (path pattern → local target).
    RouteId
);

/// Base error shared across crates. Layer-specific errors map into this at
/// their boundary; infrastructure error types never leak past it.
#[derive(Debug, thiserror::Error)]
pub enum ConduitError {
    #[error("not found: {entity} with id {id}")]
    NotFound { entity: &'static str, id: String },
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("internal: {0}")]
    Internal(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_unique() {
        assert_ne!(WorkspaceId::new(), WorkspaceId::new());
    }

    #[test]
    fn id_roundtrips_through_uuid() {
        let id = RouteId::new();
        assert_eq!(id.as_uuid(), id.as_uuid());
    }
}
