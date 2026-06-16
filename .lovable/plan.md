
# Agentic Personal Finance & Micro-Budgeting MVP — Final Plan

## 1. Architecture Summary

- **Frontend:** TanStack Start (React 19 + Vite) + Tailwind v4 + shadcn/ui. Fintech-style dashboard layout with sidebar nav, KPI cards, progress bars, and recharts visualizations.
- **Auth:** Supabase Auth (email + password). All app routes live under the integration-managed `_authenticated` layout.
- **Database:** Supabase Postgres. Every user-owned table has RLS scoped to `auth.uid() = user_id` with explicit policies for SELECT/INSERT/UPDATE/DELETE and grants to `authenticated` + `service_role`.
- **Business logic & AI:** `createServerFn` handlers in `src/lib/*.functions.ts` using `requireSupabaseAuth` middleware. AI calls (Lovable AI Gateway, `google/gemini-3-flash-preview`) happen only inside server handlers; `LOVABLE_API_KEY` never reaches the client.
- **Calculations:** Performed server-side in a `getDashboard` server fn returning DTOs (remaining per category, overall remaining, forecast spend, forecast end-of-month balance, alert flags), so the client only renders.

**Why this architecture:** TanStack Start gives one project for SSR-able UI + typed RPC server functions, removing the need for a separate API layer. Supabase RLS guarantees per-user isolation at the database level (defense-in-depth even if a server fn is misused). Server-side computation of forecasts/alerts keeps clients thin and ensures consistency.

## 2. Final Database Schema

```sql
-- Categories: per-user spending categories with monthly budget cap
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Incomes: monthly income/allowance entries (dedicated table per requirements)
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(12,2) not null check (amount >= 0),
  source text not null default 'allowance',
  created_at timestamptz not null default now(),
  unique (user_id, year, month, source)
);

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  description text not null default '',
  spent_at date not null default current_date,
  ai_suggested_category_id uuid references public.categories(id) on delete set null,
  user_corrected boolean not null default false,
  created_at timestamptz not null default now()
);
create index expenses_user_date_idx on public.expenses(user_id, spent_at desc);
create index expenses_user_category_idx on public.expenses(user_id, category_id);

-- Saving goals
create table public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
  created_at timestamptz not null default now()
);

-- Monthly reports: persisted AI summary + snapshot per (user, year, month)
create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  total_income numeric(12,2) not null,
  total_spent numeric(12,2) not null,
  remaining numeric(12,2) not null,
  forecast_spend numeric(12,2) not null,
  forecast_remaining numeric(12,2) not null,
  category_breakdown jsonb not null,
  ai_summary text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

-- Activity log: Recent Activity feed
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,         -- 'expense_added' | 'expense_updated' | 'expense_deleted' | 'budget_updated' | 'category_created' | 'category_modified' | 'category_deleted' | 'income_set' | 'goal_created' | 'goal_updated' | 'report_generated'
  entity text not null,         -- table name
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_user_time_idx on public.activity_log(user_id, created_at desc);
```

For every table: enable RLS; grants `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role`; four policies each (`select/insert/update/delete`) all scoped to `auth.uid() = user_id` (and INSERT `WITH CHECK (auth.uid() = user_id)`).

## 3. Security Checklist

| Control | Implementation |
|---|---|
| Authentication | Supabase Auth email+password; `/auth` page; `_authenticated` layout gates app |
| Authorization | RLS on every table, policies `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE |
| Ownership on writes | Server fns set `user_id = context.userId`; updates/deletes filter `.eq('user_id', userId)`; RLS enforces too |
| Server-side validation | Zod schemas in every `.inputValidator()` (amounts ≥ 0, strings trimmed/length-capped, year/month bounds) |
| Input sanitization | Zod `.trim().max()`; descriptions capped at 500 chars; no `dangerouslySetInnerHTML` anywhere |
| AI key protection | `LOVABLE_API_KEY` read via `process.env` inside server fn handlers only; never in `VITE_*` |
| No client-only validation | All mutation paths revalidate server-side |
| Secrets | Lovable Cloud `.env` is server-only; publishable keys only in client |
| AI safety | All AI outputs labeled "Suggestion — not financial advice"; user must confirm category before save |
| Privacy | One user's data never queryable by another (RLS + server fn ownership check) |
| Audit | `activity_log` records sensitive actions (insert, update, delete on financial records) |

## 4. Feature Checklist (Acceptance Mapping)

| Requirement | Page / Module |
|---|---|
| Account create + login | `/auth` (Supabase Auth) |
| Set monthly income | `/budgets` → upsert `incomes` for current month |
| Create/manage categories | `/budgets` → CRUD `categories` |
| Add expense manually | `/expenses` → form |
| Add expense via NL | `/expenses` → NL input → `parseExpense` server fn → prefilled form |
| AI category suggestion | `suggestCategory` server fn invoked on description blur / NL parse |
| Correct category before save | Editable Select in the add-expense form |
| Correct category after save | Edit row → server fn flips `user_corrected=true`; dashboard/reports auto-recompute |
| Remaining category budget | Dashboard + Budgets progress bars |
| Remaining monthly balance | Dashboard KPI |
| 80% warning + 100% exceeded | Dashboard alert banners + toast on expense add |
| Savings goals | `/savings` CRUD |
| Forecast month-end spend | Dashboard + Reports |
| Forecast remaining balance | Dashboard + Reports |
| Generate monthly report | `/reports` → `generateMonthlyReport` persists row, returns it |
| AI monthly summary | Same fn calls AI, stores in `monthly_reports.ai_summary` |
| Recent Activity | Dashboard sidebar widget reading `activity_log` |
| Data deletion (privacy) | Delete buttons on expenses/categories/goals + "Delete all my data" in profile menu |

## 5. Calculations (server-side in `getDashboard` / `generateMonthlyReport`)

- `category_spent = SUM(expenses.amount WHERE category_id = c.id AND date in month)`
- `category_remaining = c.monthly_budget - category_spent`
- `total_income = SUM(incomes.amount WHERE year, month)`
- `total_spent = SUM(expenses.amount WHERE year, month)`
- `remaining = total_income - total_spent`
- `days_passed = min(today.day, days_in_month)`, `forecast_spend = (total_spent / days_passed) * days_in_month` (guard div-by-zero → 0)
- `forecast_remaining = total_income - forecast_spend`
- Alert level per category: `>=1.0` exceeded, `>=0.8` warn

## 6. Page Structure

```
/auth                              Login + sign up
/_authenticated/route.tsx          (managed) auth gate + app shell (sidebar + topbar)
  /                                Dashboard — KPIs, alerts, category progress, forecast chart, Recent Activity
  /expenses                        Expenses list + add (manual + NL) + inline category edit
  /budgets                         Monthly income + category CRUD with budget caps
  /savings                         Saving goals CRUD with progress bars
  /reports                         Month picker → generate/view persisted report with AI summary
```

Shared shell: sidebar nav, user menu (sign out, delete all data), responsive (mobile drawer). Design tokens in `src/styles.css` — deep navy/emerald fintech palette, Inter, generous spacing, rounded-2xl cards, subtle shadows.

## 7. Server Functions (all with `requireSupabaseAuth` + Zod validation)

- `budgets.functions.ts`: `getCurrentIncome`, `upsertIncome`, `listCategories`, `upsertCategory`, `deleteCategory`
- `expenses.functions.ts`: `listExpenses(year,month)`, `addExpense`, `updateExpense`, `deleteExpense`
- `savings.functions.ts`: `listGoals`, `upsertGoal`, `deleteGoal`
- `dashboard.functions.ts`: `getDashboard(year,month)` → KPIs + per-category + forecast + alerts + recent activity
- `reports.functions.ts`: `generateMonthlyReport(year,month)`, `getMonthlyReport(year,month)`
- `ai.functions.ts`: `suggestCategory(description)`, `parseExpense(sentence)`, `summarizeMonth(stats)`
- `account.functions.ts`: `deleteAllMyData`

All mutating server fns also insert into `activity_log` in the same handler.

## 8. Out of Scope (explicitly NOT building)

Receipt OCR, shared expense split, recurring expenses, parent/guardian view, anomaly detection, RBAC/admin, multi-currency, exports.

## 9. Build Order

1. Enable Lovable Cloud
2. Migration (6 tables + indexes + grants + RLS policies)
3. Auth page, app shell + sidebar
4. Budgets page (income + categories) + activity logging
5. Expenses page (manual CRUD + inline category edit)
6. Dashboard server fn + page (KPIs, alerts, forecast, recent activity)
7. AI server fns + wire suggest/NL parse into Expenses
8. Savings page
9. Reports page (generate + persist + AI summary)
10. Account: delete-all-data
11. README: setup, architecture diagram (text), schema/ERD, AI usage declaration, limitations, demo script
