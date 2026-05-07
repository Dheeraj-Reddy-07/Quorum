-- ============================================================
-- QUORUM — pg_cron: Auto-flag overdue tasks with notifications
-- Run this in Supabase SQL Editor AFTER the main schema.
-- ============================================================

-- Step 1: Enable pg_cron extension (if not already enabled)
-- Go to: Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
-- OR run:
create extension if not exists pg_cron;

-- Step 2: Grant cron usage
grant usage on schema cron to postgres;

-- Step 3: Create helper function that inserts overdue notifications
-- This runs daily and notifies each task assignee if their task is overdue
-- and they haven't received an overdue notification in the past 24h
create or replace function public.notify_overdue_tasks()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
begin
  for rec in
    select
      t.id as task_id,
      t.title,
      t.assignee_id,
      t.project_id
    from public.tasks t
    where
      t.due_date < now()
      and t.status <> 'SHIPPED'
      and t.assignee_id is not null
      -- Don't re-notify if already notified in last 24h
      and not exists (
        select 1 from public.notifications n
        where
          n.task_id = t.id
          and n.message like 'Overdue:%'
          and n.created_at > now() - interval '24 hours'
      )
  loop
    insert into public.notifications (user_id, message, task_id)
    values (
      rec.assignee_id,
      'Overdue: "' || rec.title || '" is past its deadline',
      rec.task_id
    );
  end loop;
end;
$$;

-- Step 4: Schedule the cron job to run every day at 9 AM UTC
select cron.schedule(
  'quorum-overdue-check',   -- job name
  '0 9 * * *',              -- cron expression: daily at 9:00 UTC
  $$ select public.notify_overdue_tasks(); $$
);

-- To verify the job was created:
-- select * from cron.job;

-- To manually test the function immediately:
-- select public.notify_overdue_tasks();

-- To remove the job if needed:
-- select cron.unschedule('quorum-overdue-check');
