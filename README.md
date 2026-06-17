# Budget Buddy Agentic Personal Finance & Micro-Budgeting for Students

A privacy-first budgeting MVP. Track expenses, forecast your month-end balance, and get AI-assisted categorization, natural-language entry, and monthly summaries without exposing sensitive financial data.

Built for the MAJU CodeCraft Hackathon (Project 2).


## Problem Statement

Students often struggle to manage limited monthly income, track expenses, and plan savings effectively. Existing financial tools are often too complex, expensive, or not tailored to student budgeting habits.

Budget Buddy helps students manage income, expenses, budgets, and savings goals through a simple AI-assisted personal finance platform that provides budgeting insights, spending forecasts, and financial awareness.


## Why Budget Buddy?

Budget Buddy is designed specifically for students who need a lightweight financial management solution.

The platform helps users:

* Understand where their money is going
* Stay within budget limits
* Build savings habits
* Receive AI-assisted financial insights
* Forecast future spending before overspending occurs


## Tech Stack

- **Frontend:** React 19 + TanStack Start + TanStack Router + Tailwind v4 + shadcn/ui + Recharts
- **Backend:** TanStack Start server functions (`createServerFn`)  typed RPC, no separate API layer
- **Database & Auth:** Lovable Cloud (Supabase Postgres + Auth) with Row Level Security
- **AI:** Lovable AI Gateway (`google/gemini-3-flash-preview`)

## Architecture

```
Browser (React + TanStack Query)
    │  typed RPC over HTTPS (bearer token auto-attached)
    ▼
TanStack Start server functions  ── requireSupabaseAuth middleware
    │  per-user Supabase client (RLS enforced as that user)
    ├──► Postgres (categories, incomes, expenses, saving_goals, monthly_reports, activity_log)
    └──► Lovable AI Gateway (categorize · NL parse · monthly summary)
```

All business logic and AI calls run server-side. The client never sees the AI key, the service role key, or another user's data — RLS denies it at the database level.

## Database Schema (ERD)

```
auth.users (managed)
   │ 1
   ├──< categories         (name, monthly_budget)
   ├──< incomes            (year, month, amount, source)
   ├──< expenses           (amount, description, spent_at, category_id, ai_suggested_category_id, user_corrected)
   ├──< saving_goals       (name, target_amount, saved_amount)
   ├──< monthly_reports    (year, month, totals, forecast_*, category_breakdown JSON, ai_summary)
   └──< activity_log       (action, entity, entity_id, metadata)
```

Every table:
- `user_id uuid REFERENCES auth.users ON DELETE CASCADE` (NOT NULL)
- RLS enabled
- Four policies (`SELECT/INSERT/UPDATE/DELETE`) scoped to `auth.uid() = user_id`
- Explicit `GRANT`s to `authenticated` + `service_role`

## Project Structure

```
src/
├── integrations/supabase/    # Auto-generated Cloud clients + auth middleware
├── lib/
│   ├── finance.functions.ts  # All server functions (RPC handlers)
│   └── ai-gateway.server.ts  # Server-only AI helper
├── routes/
│   ├── __root.tsx            # Shell, QueryClient, Toaster, auth listener
│   ├── index.tsx             # Redirect to /dashboard or /auth
│   ├── auth.tsx              # Login + sign up
│   └── _authenticated/       # Auth-gated app (sidebar shell)
│       ├── route.tsx         # Layout + nav + sign-out + delete-my-data
│       ├── dashboard.tsx     # KPIs, alerts, category chart, recent activity
│       ├── expenses.tsx      # Manual add + NL parse + AI categorize + inline edit
│       ├── budgets.tsx       # Monthly income + category CRUD
│       ├── savings.tsx       # Saving goals CRUD
│       └── reports.tsx       # Generate + view AI monthly report
└── styles.css                # Design tokens (deep navy + emerald accent)
```

## Features (Acceptance Mapping)

| Acceptance item | Where it lives |
|---|---|
| Student creates monthly budget + categories | `/budgets` → `upsertIncome`, `upsertCategory` |
| Student adds expenses persistently | `/expenses` → `addExpense` |
| Add via natural language | `/expenses` → `parseExpense` (AI) → user confirms → `addExpense` |
| AI suggests category, user corrects | `suggestCategory` AI + inline `<Select>` correction; `user_corrected` flag stored |
| Remaining category/monthly budget | `getDashboard` computes server-side |
| Warning at 80% / exceeded at 100% | Dashboard alert banner + category status badges |
| Forecast end-of-month balance | `(spent / days_passed) * days_in_month`, returned by `getDashboard` and persisted in `monthly_reports` |
| Monthly report + AI summary | `/reports` → `generateMonthlyReport` upserts `monthly_reports` row |
| Recent activity feed | `activity_log` table + Dashboard widget |
| Edit/delete own records | Inline edit on expenses; delete buttons on all entities |
| Delete all data | User menu → `deleteAllMyData` server fn |

## Calculations

- **Remaining category budget** = `category.monthly_budget − Σ expenses in month for that category`
- **Remaining monthly balance** = `Σ incomes for month − Σ expenses for month`
- **Forecast monthly spend** = `(spent_so_far / days_passed) × days_in_month`
- **Forecast remaining balance** = `monthly_income − forecast_spend`
- Alert thresholds: ≥ 80 % → warn, ≥ 100 % → exceeded

## Key Engineering Decisions

* TanStack Start was selected to keep frontend and backend logic within a single type-safe application.
* Supabase was chosen for authentication, PostgreSQL persistence, and Row Level Security.
* Server Functions centralize business logic and reduce client-side complexity.
* AI functionality is isolated behind server-side handlers to protect API keys and improve security.
* Financial calculations are performed server-side to ensure consistency across all views.


## Security

- **Authentication:** Supabase Auth (email + password). `/_authenticated/*` routes gated by client + server bearer check.
- **Authorization:** RLS on every table, scoped to `auth.uid() = user_id` for `SELECT/INSERT/UPDATE/DELETE`.
- **Ownership on writes:** server fns always set `user_id = context.userId` and filter `.eq('user_id', userId)` on update/delete.
- **Server-side validation:** every server fn validates input with Zod (length, range, format).
- **No client-only validation:** all mutations re-validate on the server.
- **AI key protection:** `LOVABLE_API_KEY` read inside server fn handlers only — never bundled into client code.
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` never used at module scope of client-reachable files.
- **AI safety:** every AI output labeled as a suggestion, not financial advice.
- **Privacy:** users can delete all their data from the user menu (cascading deletes).
- **Audit:** sensitive writes append to `activity_log` for the Recent Activity feed.

## AI Usage Declaration

| Question | Answer |
|---|---|
| Which AI tools were used? | Lovable AI Gateway (`google/gemini-3-flash-preview`) at runtime. Lovable AI assistant for coding assistance. |
| Was AI used for coding assistance? | Yes — code was reviewed and edited by the team. |
| Was AI used inside the product as a feature? | Yes — expense categorization, natural-language expense parsing, and monthly summary. |
| Which parts were AI-generated and then modified? | All AI features call the gateway live; no AI text is hard-coded. Categorization output is constrained to the user's own category list. |
| Which AI outputs are mocked? | None. If the gateway fails, the report still persists with the failure reason in `ai_summary`. |
| How can users review/override AI output? | NL parse fills the form for confirmation before save. Categorization is a `<Select>` the user can change before AND after save (`user_corrected` flag recorded). Monthly summary is text-only — user can regenerate. |
| Safety limits / disclaimers | Every AI-touching UI shows "AI suggestion — not financial advice." AI is never the final authority on a financial decision. |

## Setup (Local)

This project runs on Lovable Cloud — backend and AI gateway are pre-provisioned. Required env vars (auto-injected by Lovable Cloud, also in `.env`):

- `VITE_SUPABASE_URL` (client)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (client)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server)
- `LOVABLE_API_KEY` (server, AI)

```bash
bun install
bun run dev
```

Open the dev URL, click **Create account**, and sign in.

## Demo Story (5 minutes)

1. Sign up → land on Dashboard (empty state).
2. **Budgets:** set monthly income `500`, add categories `Food 150`, `Transport 60`, `Subscriptions 30`.
3. **Expenses → Add by sentence:** "Spent 8 on coffee this morning" → AI parses → save.
4. Manually add: `Bus pass 50` (Transport), `Netflix 15` (Subscriptions), `Groceries 80` (Food).
5. Add another `Lunch 70` (Food) → 80 % alert appears on Dashboard.
6. Edit one expense category to demonstrate correction tracking.
7. **Reports:** click **Generate** → see forecast + AI summary.
8. **Savings:** Create a goal `Laptop 800`, adding money by seeing a percentage.
9. Show **Recent Activity** on Dashboard reflecting every action.
10. User menu → **Delete all my data** → confirm privacy guarantee.

## Known Limitations / Future Scope

- Single role (student). Parent/guardian view and financial-mentor sharing are not implemented.
- No receipt OCR, no recurring-expense engine, no shared expense splitting.
- Currency-agnostic — amounts are unitless numbers; multi-currency is a future scope.
- AI categorisation quality depends on the user's category names.
- No PWA/offline support yet.

---

Built by Team ARKVEX · Abdul Basit
