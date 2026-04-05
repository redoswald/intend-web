-- Task dependency junction table: supports multiple blockers per task
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- Indexes for lookups in both directions
CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Enable RLS
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage dependencies on their own tasks
CREATE POLICY "Users can view dependencies on their tasks"
  ON task_dependencies FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE owner_id = auth.uid())
    OR depends_on_task_id IN (SELECT id FROM tasks WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can insert dependencies on their tasks"
  ON task_dependencies FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete dependencies on their tasks"
  ON task_dependencies FOR DELETE
  USING (
    task_id IN (SELECT id FROM tasks WHERE owner_id = auth.uid())
  );

-- Migrate existing blocked_by data
INSERT INTO task_dependencies (task_id, depends_on_task_id)
SELECT id, blocked_by FROM tasks
WHERE blocked_by IS NOT NULL
ON CONFLICT DO NOTHING;
