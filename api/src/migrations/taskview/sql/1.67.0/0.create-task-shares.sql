CREATE TABLE IF NOT EXISTS tasks.task_shares (
    id          INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    task_id     INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    token       VARCHAR(64) NOT NULL,
    created_by  INTEGER REFERENCES tv_auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMP,
    CONSTRAINT task_shares_token_unique UNIQUE (token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_shares_active_task
    ON tasks.task_shares (task_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_shares_token ON tasks.task_shares (token);
