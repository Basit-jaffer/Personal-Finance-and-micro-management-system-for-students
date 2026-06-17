## Goal
Show a clear notification when a user tries to sign up with an email that already has an account.

## How
1. **Database migration** — Add a `public.check_email_exists(email)` Postgres function that reads `auth.users` using `SECURITY DEFINER`. This lets the frontend safely ask whether an email is taken without exposing auth tables.
2. **Server function** — Create `src/lib/auth.functions.ts` with a `checkEmailExists` server function that calls the RPC.
3. **Auth page update** — In `src/routes/auth.tsx`, before calling `supabase.auth.signUp`, invoke `checkEmailExists`. If it returns `true`, show `toast.error("An account with this email already exists.")` and switch the tab to **Sign in**.

## Files
- `src/lib/auth.functions.ts` (new)
- `src/routes/auth.tsx` (update sign-up flow)
- Database migration (new function only, no table changes)