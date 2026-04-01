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

The frontend default table is `applications` (`SUBMISSIONS_TABLE` in `public/app.js`). If you ran `supabase/schema.sql` as-is, set this value back to `form_submissions`.

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

## 2) Configure Environment in Frontend

Open `public/app.js` and update:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

(For production, inject these at build/deploy time or generate `app.js` from env variables.)

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

## Notes

- This app uses **Supabase Auth email/password login** for all roles.
- Role-based actions are protected by **Row-Level Security policies**.
- Admin charts use Chart.js via CDN.
