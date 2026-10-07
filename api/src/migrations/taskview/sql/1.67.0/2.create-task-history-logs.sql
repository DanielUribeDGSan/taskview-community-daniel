CREATE TABLE IF NOT EXISTS tasks.task_history_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    user_id INTEGER,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_logs_task_id ON tasks.task_history_logs(task_id, created_at DESC);
