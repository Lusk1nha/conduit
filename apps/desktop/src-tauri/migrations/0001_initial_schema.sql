-- conduit.db — workspace, service, and relay configuration for the desktop app.
-- See docs/SYSTEM_DESIGN.md § Database Schemas.
--
-- Running service instance state is intentionally NOT persisted here: it lives
-- in memory and is reconstructed on startup (see docs/ARCHITECTURE.md).

CREATE TABLE workspaces (
    id          TEXT PRIMARY KEY,               -- UUIDv7
    slug        TEXT NOT NULL UNIQUE,           -- e.g. "my-project"
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,                  -- ISO 8601
    updated_at  TEXT NOT NULL
);

CREATE TABLE service_definitions (
    id              TEXT PRIMARY KEY,           -- UUIDv7
    workspace_id    TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    kind            TEXT NOT NULL,              -- "binary" | "docker" | "script"
    entry_point     TEXT NOT NULL,              -- binary path, image name, or script path
    args            TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
    env_vars        TEXT NOT NULL DEFAULT '{}', -- JSON object { KEY: VALUE }
    working_dir     TEXT,
    port            INTEGER,
    auto_start      INTEGER NOT NULL DEFAULT 0, -- boolean
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE relay_configs (
    id                  TEXT PRIMARY KEY,       -- UUIDv7
    workspace_id        TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    vps_host            TEXT NOT NULL,
    vps_port            INTEGER NOT NULL DEFAULT 22,
    vps_user            TEXT NOT NULL DEFAULT 'conduit',
    public_port         INTEGER NOT NULL,
    private_key_path    TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX idx_service_definitions_workspace_id ON service_definitions (workspace_id);
CREATE INDEX idx_relay_configs_workspace_id ON relay_configs (workspace_id);
