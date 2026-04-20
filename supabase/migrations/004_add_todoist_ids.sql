-- Add Todoist ID columns for sync support
-- These allow us to track which Intend records came from Todoist
-- and enable upsert-based sync without duplicates

-- Projects
ALTER TABLE projects ADD COLUMN todoist_id TEXT UNIQUE;
CREATE INDEX idx_projects_todoist_id ON projects(todoist_id) WHERE todoist_id IS NOT NULL;

-- Sections
ALTER TABLE sections ADD COLUMN todoist_id TEXT UNIQUE;
CREATE INDEX idx_sections_todoist_id ON sections(todoist_id) WHERE todoist_id IS NOT NULL;

-- Tasks
ALTER TABLE tasks ADD COLUMN todoist_id TEXT UNIQUE;
CREATE INDEX idx_tasks_todoist_id ON tasks(todoist_id) WHERE todoist_id IS NOT NULL;
