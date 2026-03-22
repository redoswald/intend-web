-- ============================================================
-- STEP 1: DIAGNOSTIC — Run this first to see what needs backfilling
-- ============================================================

-- All tasks with recurrence rules (open and completed)
SELECT
  id,
  title,
  status,
  due_date,
  recurrence_rule,
  recurrence_base_date,
  completed_at::date as completed_date
FROM tasks
WHERE recurrence_rule IS NOT NULL
ORDER BY status, title;


-- ============================================================
-- STEP 2: Find completed recurring tasks missing an open successor
-- ============================================================

SELECT
  t.id,
  t.title,
  t.status,
  t.due_date,
  t.recurrence_rule,
  t.completed_at::date as completed_date,
  -- Calculate next due date based on RRULE
  CASE
    WHEN t.recurrence_rule LIKE 'FREQ=DAILY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) || ' days')::interval

    WHEN t.recurrence_rule LIKE 'FREQ=WEEKLY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) * 7 || ' days')::interval

    WHEN t.recurrence_rule LIKE 'FREQ=MONTHLY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) || ' months')::interval

    WHEN t.recurrence_rule LIKE 'FREQ=YEARLY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) || ' years')::interval
  END as next_due_date,
  EXISTS (
    SELECT 1 FROM tasks open_t
    WHERE open_t.status = 'open'
      AND open_t.title = t.title
      AND open_t.recurrence_rule = t.recurrence_rule
  ) as has_open_successor
FROM tasks t
WHERE t.status = 'done'
  AND t.recurrence_rule IS NOT NULL
ORDER BY t.title;


-- ============================================================
-- STEP 3: BACKFILL — Creates missing next occurrences
-- Only run after reviewing Step 2 output!
-- ============================================================

INSERT INTO tasks (
  owner_id, title, description, project_id, section_id,
  parent_task_id, priority, due_date, due_time,
  recurrence_rule, recurrence_base_date, sort_order
)
SELECT
  t.owner_id,
  t.title,
  t.description,
  t.project_id,
  t.section_id,
  t.parent_task_id,
  t.priority,
  -- Calculate next due date
  (CASE
    WHEN t.recurrence_rule LIKE 'FREQ=DAILY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) || ' days')::interval

    WHEN t.recurrence_rule LIKE 'FREQ=WEEKLY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) * 7 || ' days')::interval

    WHEN t.recurrence_rule LIKE 'FREQ=MONTHLY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) || ' months')::interval

    WHEN t.recurrence_rule LIKE 'FREQ=YEARLY%' THEN
      COALESCE(t.due_date, t.completed_at::date) +
      (COALESCE(
        NULLIF(regexp_replace(t.recurrence_rule, '.*INTERVAL=(\d+).*', '\1'), t.recurrence_rule)::int,
        1
      ) || ' years')::interval
  END)::date,
  t.due_time,
  t.recurrence_rule,
  t.recurrence_base_date,
  t.sort_order
FROM tasks t
WHERE t.status = 'done'
  AND t.recurrence_rule IS NOT NULL
  -- Only backfill if no open successor already exists
  AND NOT EXISTS (
    SELECT 1 FROM tasks open_t
    WHERE open_t.status = 'open'
      AND open_t.title = t.title
      AND open_t.recurrence_rule = t.recurrence_rule
  );
