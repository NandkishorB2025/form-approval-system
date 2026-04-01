# Form Approval System

## Supabase setup

1. Install the Supabase client package:
   ```bash
   npm install @supabase/supabase-js
   ```
2. Copy `.env.example` to `.env` and replace values with your own API URL and API key.
3. Import and use API functions from `src/api/applications.js`:
   - `submitForm(formData)`
   - `getApplications()`
   - `updateStatus(id, status)`
