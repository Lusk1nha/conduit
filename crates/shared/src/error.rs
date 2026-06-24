//! Cross-cutting error vocabulary.
//!
//! `ConduitError` is the common base every layer maps into at its boundary.
//! It is deliberately I/O-free — `sqlx::Error`, `reqwest::Error`, `russh`
//! errors, etc. are translated into one of these variants by the
//! infrastructure layer of each crate, so they never leak inward. This keeps
//! the domain and application layers testable without any I/O dependency.

/// The shared error type used across the workspace boundary.
#[derive(Debug, thiserror::Error)]
pub enum ConduitError {
    /// A lookup failed: the entity does not exist.
    #[error("not found: {entity} with id {id}")]
    NotFound {
        entity: &'static str,
        id: String,
    },

    /// The operation conflicts with current state (e.g. duplicate slug).
    #[error("conflict: {0}")]
    Conflict(String),

    /// Input failed validation before any side effect ran.
    #[error("validation failed: {0}")]
    Validation(String),

    /// An unexpected failure. Carries a human-readable message; the original
    /// cause is logged at the boundary where it is mapped.
    #[error("internal error: {0}")]
    Internal(String),
}

impl ConduitError {
    /// Convenience constructor for [`ConduitError::NotFound`].
    pub fn not_found(entity: &'static str, id: impl std::fmt::Display) -> Self {
        Self::NotFound {
            entity,
            id: id.to_string(),
        }
    }

    /// Convenience constructor for [`ConduitError::Validation`].
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    /// Convenience constructor for [`ConduitError::Conflict`].
    pub fn conflict(msg: impl Into<String>) -> Self {
        Self::Conflict(msg.into())
    }

    /// Convenience constructor for [`ConduitError::Internal`].
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

/// Workspace-wide `Result` alias defaulting to [`ConduitError`].
pub type ConduitResult<T, E = ConduitError> = std::result::Result<T, E>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_found_renders_entity_and_id() {
        let err = ConduitError::not_found("Workspace", "abc");
        assert_eq!(err.to_string(), "not found: Workspace with id abc");
    }

    #[test]
    fn validation_helper_wraps_message() {
        let err = ConduitError::validation("slug must be lowercase");
        assert!(matches!(err, ConduitError::Validation(_)));
        assert_eq!(err.to_string(), "validation failed: slug must be lowercase");
    }
}
