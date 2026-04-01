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
- `form_submissions` table (stores applicant data)
- role-aware RLS policies for applicant/scrutiny/admin access

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

- `username1` / `Pass@123` (Applicant)
- `username2` / `Pass@123` (Scrutiny)
- `username3` / `Pass@123` (Admin)

The login field supports either these usernames or full email addresses.

## 2) Configure Environment in Frontend

Set credentials in one of these ways:

- Edit defaults in `public/app.js`, or
- Inject globals before `app.js` loads:

```html
<script>
  window.SUPABASE_URL = "https://<project>.supabase.co";
  window.SUPABASE_ANON_KEY = "<anon-key>";
</script>
```

Without these values, app runs in demo mode only and cannot persist live submissions.

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
