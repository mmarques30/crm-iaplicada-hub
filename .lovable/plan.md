

## Problem

The entire app is blank due to a fatal error: `supabaseKey is required.`

The `.env` file defines `VITE_SUPABASE_PUBLISHABLE_KEY` but `src/integrations/supabase/client.ts` reads `import.meta.env.VITE_SUPABASE_ANON_KEY` — which doesn't exist. This crashes the app before any component renders.

## Fix

**File: `src/integrations/supabase/client.ts`** (line 6)

Change the env variable name from `VITE_SUPABASE_ANON_KEY` to `VITE_SUPABASE_PUBLISHABLE_KEY` to match the `.env` file.

After this fix, the app will boot and we can verify all pages (Dashboard, Pipeline, Contacts, Settings) display their structure with empty states and skeletons.

