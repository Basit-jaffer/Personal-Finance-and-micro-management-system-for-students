
-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_budget numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_budget >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_own" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- INCOMES
CREATE TABLE public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  source text NOT NULL DEFAULT 'allowance',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incomes_select_own" ON public.incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "incomes_insert_own" ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_update_own" ON public.incomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_delete_own" ON public.incomes FOR DELETE USING (auth.uid() = user_id);

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL DEFAULT '',
  spent_at date NOT NULL DEFAULT current_date,
  ai_suggested_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  user_corrected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_user_date_idx ON public.expenses(user_id, spent_at DESC);
CREATE INDEX expenses_user_category_idx ON public.expenses(user_id, category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- SAVING GOALS
CREATE TABLE public.saving_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(12,2) NOT NULL CHECK (target_amount > 0),
  saved_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saving_goals TO authenticated;
GRANT ALL ON public.saving_goals TO service_role;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saving_goals_select_own" ON public.saving_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saving_goals_insert_own" ON public.saving_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saving_goals_update_own" ON public.saving_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saving_goals_delete_own" ON public.saving_goals FOR DELETE USING (auth.uid() = user_id);

-- MONTHLY REPORTS
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_income numeric(12,2) NOT NULL,
  total_spent numeric(12,2) NOT NULL,
  remaining numeric(12,2) NOT NULL,
  forecast_spend numeric(12,2) NOT NULL,
  forecast_remaining numeric(12,2) NOT NULL,
  category_breakdown jsonb NOT NULL,
  ai_summary text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reports TO authenticated;
GRANT ALL ON public.monthly_reports TO service_role;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_reports_select_own" ON public.monthly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "monthly_reports_insert_own" ON public.monthly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_reports_update_own" ON public.monthly_reports FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_reports_delete_own" ON public.monthly_reports FOR DELETE USING (auth.uid() = user_id);

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_user_time_idx ON public.activity_log(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_select_own" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_log_insert_own" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
