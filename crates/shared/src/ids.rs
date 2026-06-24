//! Strongly-typed, time-ordered identifiers.
//!
//! Every aggregate and entity in the system is keyed by a newtype wrapping a
//! UUIDv7. UUIDv7 is time-ordered, so IDs sort by creation time — which keeps
//! SQLite primary-key inserts append-friendly and makes pagination cursors
//! trivial.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Generates a strongly-typed UUIDv7 newtype ID with the standard set of
/// conversions (`new`, `as_uuid`, `Display`, `FromStr`, `Default`).
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

            /// Wraps an existing UUID (e.g. when hydrating from the database).
            #[must_use]
            pub fn from_uuid(uuid: Uuid) -> Self {
                Self(uuid)
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

        impl std::str::FromStr for $name {
            type Err = uuid::Error;

            fn from_str(s: &str) -> Result<Self, Self::Err> {
                Ok(Self(Uuid::parse_str(s)?))
            }
        }

        impl From<$name> for Uuid {
            fn from(id: $name) -> Self {
                id.0
            }
        }
    };
}

id_newtype!(
    /// Identifies a developer workspace (project) — `conduit-app` aggregate root.
    WorkspaceId
);
id_newtype!(
    /// Identifies a service definition within a workspace.
    ServiceDefinitionId
);
id_newtype!(
    /// Identifies a running instance of a service definition.
    ServiceInstanceId
);
id_newtype!(
    /// Identifies a webhook route (path pattern → local target) — `relay`.
    RouteId
);
id_newtype!(
    /// Identifies a single received webhook event — `relay` aggregate root.
    WebhookEventId
);
id_newtype!(
    /// Identifies one delivery attempt appended to a webhook event.
    DeliveryAttemptId
);

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn ids_are_unique() {
        assert_ne!(WorkspaceId::new(), WorkspaceId::new());
    }

    #[test]
    fn id_roundtrips_through_string() {
        let id = RouteId::new();
        let parsed = RouteId::from_str(&id.to_string()).expect("valid uuid");
        assert_eq!(id, parsed);
    }

    #[test]
    fn id_roundtrips_through_uuid() {
        let raw = WebhookEventId::new().as_uuid();
        assert_eq!(WebhookEventId::from_uuid(raw).as_uuid(), raw);
    }
}
