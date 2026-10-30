-- HospitalFlow AI: private user workspaces
-- Run this ONCE in Supabase -> SQL Editor, BEFORE deploying the new code.
-- It is safe: existing demo data is kept (owner_email stays empty = demo workspace).

-- 1) Each record can belong to a signed-in user's workspace
alter table operational_issues add column if not exists owner_email text;
alter table workflow_actions   add column if not exists owner_email text;
alter table audit_logs         add column if not exists owner_email text;
alter table upload_batches     add column if not exists owner_email text;

create index if not exists idx_operational_issues_owner on operational_issues (owner_email);
create index if not exists idx_workflow_actions_owner   on workflow_actions (owner_email);
create index if not exists idx_audit_logs_owner         on audit_logs (owner_email);

-- 2) Demo accounts (password stored hashed by the app)
create table if not exists app_users (
  email text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Keep this table private: only the server (service role key) may read it.
alter table app_users enable row level security;
