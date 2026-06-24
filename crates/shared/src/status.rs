//! Shared status enums that cross the wire between `relay`, the `conduit-app`
//! Rust core, and (after serialization) the React frontend.
//!
//! These mirror the state machines documented in `docs/SYSTEM_DESIGN.md`.
//! Variants carrying data use an internally-tagged representation so the
//! serialized shape is ergonomic for the TypeScript side (`{ "state": "...",
//! ... }`).

use serde::{Deserialize, Serialize};

/// How a managed service is launched.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceKind {
    Binary,
    Docker,
    Script,
}

/// Lifecycle state of a running service instance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceStatus {
    Starting,
    Running,
    Stopping,
    Stopped,
    Crashed,
}

/// Outcome of a single webhook delivery attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DeliveryStatus {
    /// Queued, not yet picked up by a worker.
    Pending,
    /// A worker is currently forwarding the request.
    Delivering,
    /// Target returned a 2xx response.
    Succeeded,
    /// Attempt failed. `retryable` is false for 4xx/5xx (bad config), true for
    /// transport errors (connection refused, timeout, DNS).
    Failed { retryable: bool },
    /// All retry attempts were used without success.
    Exhausted,
}

/// State of the relay daemon's reverse-SSH tunnel.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum TunnelState {
    Disconnected,
    Connecting,
    Connected {
        public_url: String,
    },
    Reconnecting {
        attempt: u32,
        /// ISO-8601 timestamp at which the next attempt is scheduled.
        backoff_until: String,
    },
}

impl DeliveryStatus {
    /// Whether this status represents a terminal (non-retryable) outcome.
    #[must_use]
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            DeliveryStatus::Succeeded
                | DeliveryStatus::Exhausted
                | DeliveryStatus::Failed { retryable: false }
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_kind_serializes_snake_case() {
        let json = serde_json::to_string(&ServiceKind::Docker).unwrap();
        assert_eq!(json, "\"docker\"");
    }

    #[test]
    fn tunnel_state_is_internally_tagged() {
        let json = serde_json::to_string(&TunnelState::Connected {
            public_url: "https://x.example".into(),
        })
        .unwrap();
        assert_eq!(json, "{\"state\":\"connected\",\"public_url\":\"https://x.example\"}");
    }

    #[test]
    fn failed_4xx_is_terminal_but_retryable_transport_is_not() {
        assert!(DeliveryStatus::Failed { retryable: false }.is_terminal());
        assert!(!DeliveryStatus::Failed { retryable: true }.is_terminal());
        assert!(!DeliveryStatus::Pending.is_terminal());
    }
}
