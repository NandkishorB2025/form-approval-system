# Form Approval System

A deployment-ready full-stack form approval workflow built with plain HTML/JavaScript on the frontend and Supabase as the backend.

## Roles

1. **Applicant**: submits form data (name, email, feedback).
2. **Scrutiny**: reviews pending submissions and approves/rejects.
3. **Admin**: views reports and charts.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Supabase (PostgreSQL + Auth + RLS + API)
- Deployment: Vercel-compatible static app

## Folder Structure

```text
.
├── public
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── supabase
│   └── schema.sql
├── package.json
├── vercel.json
└── README.md
```

## 1) Supabase Setup

Create a Supabase project and run the SQL in `supabase/schema.sql`.

This creates:

- `profiles` table (maps users to roles)
- `form_submissions` table (stores applicant data; default schema included in this repo)
- optional `applications` table support (the frontend default points to `applications` for compatibility with existing setups)
- role-aware RLS policies for applicant/scrutiny/admin access

The frontend default table is `applications` (`SUBMISSIONS_TABLE` in `public/app.js`). The provided `supabase/schema.sql` now auto-creates both `form_submissions` and `applications` with matching columns/RLS, so the default frontend works without extra edits.

If you already created an `applications` table manually with wrong column types (for example `applicant_username` as `int2`), run this before re-running `supabase/schema.sql`:

```sql
drop table if exists public.applications cascade;
```


### Create users

In Supabase Auth, create users for each role. Then assign roles in SQL:

```sql
insert into public.profiles (id, role)
values
  ('<APPLICANT_USER_UUID>', 'applicant'),
  ('<SCRUTINY_USER_UUID>', 'scrutiny'),
  ('<ADMIN_USER_UUID>', 'admin')
on conflict (id) do update set role = excluded.role;
```

### Default demo credentials

- `Nandkishor2026` / `Pass@123` (Applicant)
- `Scrutiny2026` / `Pass@123` (Scrutiny)
- `Admin2026` (or `forAdmin2026`) / `Pass@123` (Admin)

In demo mode, these usernames work directly. In Supabase mode, login is email/password by default; map custom usernames to emails in `USERNAME_EMAIL_MAP` in `public/app.js` if needed.

## 2) Configure Environment for Local and Production

This project supports runtime config using `public/env.js` (loaded before `app.js`).

For local setup:

1. Copy `public/env.js.example` to `public/env.js`.
2. Set values for:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUBMISSIONS_TABLE` (use `form_submissions` when using `supabase/schema.sql`)

For production on Vercel/GitHub:

- Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and (optionally) `SUBMISSIONS_TABLE` as environment variables in Vercel.
- `npm run build` generates `public/env.js` from those variables via `scripts/generate-env.js`.

## 3) Run Locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>

## 4) Deploy to Vercel

1. Push to your Git repo.
2. Import project in Vercel.
3. Deploy (uses static configuration in `vercel.json`).

## 5) Optional: Run Supabase Migrations from GitHub Actions

This repository includes `.github/workflows/supabase-migrate.yml` to run database migrations on push to `main`.

Add these GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

Then add migration files using Supabase CLI (example):

```bash
supabase login
supabase link --project-ref <your_project_ref>
supabase migration new init_schema
```

Move `supabase/schema.sql` content into migration files, commit, and push.

## Notes

- This app uses **Supabase Auth email/password login** for all roles.
- Role-based actions are protected by **Row-Level Security policies**.
- Admin charts use Chart.js via CDN.
