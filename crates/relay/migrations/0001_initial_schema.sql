-- relay.db — webhook routing + immutable, event-sourced delivery log.
-- See docs/SYSTEM_DESIGN.md § Database Schemas.

CREATE TABLE webhook_routes (
    id              TEXT PRIMARY KEY,           -- UUIDv7
    workspace_id    TEXT NOT NULL,
    path_pattern    TEXT NOT NULL,              -- e.g. "/github"
    target_url      TEXT NOT NULL,              -- e.g. "http://localhost:3000/webhooks/github"
    description     TEXT,
    enabled         INTEGER NOT NULL DEFAULT 1, -- boolean
    created_at      TEXT NOT NULL,              -- ISO 8601
    updated_at      TEXT NOT NULL,
    UNIQUE (workspace_id, path_pattern)
);

CREATE TABLE webhook_events (
    id              TEXT PRIMARY KEY,           -- UUIDv7
    route_id        TEXT NOT NULL REFERENCES webhook_routes (id),
    method          TEXT NOT NULL,              -- "POST" | "PUT" | ...
    path            TEXT NOT NULL,
    headers         TEXT NOT NULL,              -- JSON object
    body            TEXT,                       -- raw body (nullable for GET)
    source_ip       TEXT NOT NULL,
    received_at     TEXT NOT NULL               -- ISO 8601, immutable
);

CREATE TABLE delivery_attempts (
    id              TEXT PRIMARY KEY,           -- UUIDv7
    event_id        TEXT NOT NULL REFERENCES webhook_events (id),
    attempt_number  INTEGER NOT NULL,
    target_url      TEXT NOT NULL,
    status          TEXT NOT NULL,              -- "Success" | "HttpError" | "ConnectionRefused" | "Timeout"
    http_status     INTEGER,                    -- null on transport-level error
    response_body   TEXT,
    elapsed_ms      INTEGER NOT NULL,
    attempted_at    TEXT NOT NULL               -- ISO 8601, immutable
);

CREATE INDEX idx_webhook_events_route_id ON webhook_events (route_id);
CREATE INDEX idx_webhook_events_received_at ON webhook_events (received_at DESC);
CREATE INDEX idx_delivery_attempts_event_id ON delivery_attempts (event_id);
