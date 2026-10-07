CREATE TABLE IF NOT EXISTS tasks.task_comments (
    id              INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    task_id         INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    body            VARCHAR(2000) NOT NULL,
    author_name     VARCHAR(80) NOT NULL,
    author_user_id  INTEGER REFERENCES tv_auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
    ON tasks.task_comments (task_id, created_at ASC);
