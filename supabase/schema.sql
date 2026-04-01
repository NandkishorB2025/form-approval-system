-- Enable required extension
create extension if not exists "pgcrypto";

-- Roles table mapped to authenticated users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('applicant', 'scrutiny', 'admin')),
  created_at timestamptz not null default now()
);

-- Canonical form submissions table
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  feedback text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_form_submissions_status on public.form_submissions(status);
create index if not exists idx_form_submissions_created_at on public.form_submissions(created_at desc);

-- Compatibility table used by the frontend default (SUBMISSIONS_TABLE = 'applications')
-- This auto-creates a clean schema even if a previous manual table had wrong types.
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  feedback text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_status on public.applications(status);
create index if not exists idx_applications_created_at on public.applications(created_at desc);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at on public.form_submissions;
create trigger trg_set_updated_at
before update on public.form_submissions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_applications on public.applications;
create trigger trg_set_updated_at_applications
before update on public.applications
for each row
execute function public.set_updated_at();

-- Auto-create applicant profile for new auth users by default
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'applicant')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Role helper
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.form_submissions enable row level security;
alter table public.applications enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins can upsert profiles"
on public.profiles
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Form submissions policies
create policy "Applicants can insert submissions"
on public.form_submissions
for insert
to authenticated
with check (
  public.current_user_role() = 'applicant'
  and applicant_id = auth.uid()
);

create policy "Applicants can view their own submissions"
on public.form_submissions
for select
to authenticated
using (
  public.current_user_role() = 'applicant'
  and applicant_id = auth.uid()
);

create policy "Scrutiny can read all submissions"
on public.form_submissions
for select
to authenticated
using (public.current_user_role() in ('scrutiny', 'admin'));

create policy "Scrutiny can update statuses"
on public.form_submissions
for update
to authenticated
using (public.current_user_role() in ('scrutiny', 'admin'))
with check (public.current_user_role() in ('scrutiny', 'admin'));

-- Optional: allow admin delete for cleanup
create policy "Admin can delete submissions"
on public.form_submissions
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- Applications policies (mirrors form_submissions for frontend compatibility)
create policy "Applicants can insert applications"
on public.applications
for insert
to authenticated
with check (
  public.current_user_role() = 'applicant'
  and applicant_id = auth.uid()
);

create policy "Applicants can view their own applications"
on public.applications
for select
to authenticated
using (
  public.current_user_role() = 'applicant'
  and applicant_id = auth.uid()
);

create policy "Scrutiny can read all applications"
on public.applications
for select
to authenticated
using (public.current_user_role() in ('scrutiny', 'admin'));

create policy "Scrutiny can update application statuses"
on public.applications
for update
to authenticated
using (public.current_user_role() in ('scrutiny', 'admin'))
with check (public.current_user_role() in ('scrutiny', 'admin'));

create policy "Admin can delete applications"
on public.applications
for delete
to authenticated
using (public.current_user_role() = 'admin');
