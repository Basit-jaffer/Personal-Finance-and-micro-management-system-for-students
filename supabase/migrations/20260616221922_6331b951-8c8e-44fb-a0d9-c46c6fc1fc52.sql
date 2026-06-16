
-- INCOMES: allow multiple entries per month, add date + description
ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS occurred_on date NOT NULL DEFAULT (CURRENT_DATE),
  ADD COLUMN IF NOT EXISTS description text;

-- Drop legacy unique constraint that forced one row per (user, year, month, source)
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.incomes'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.incomes DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- SAVING CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS public.saving_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  contributed_on date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saving_contributions TO authenticated;
GRANT ALL ON public.saving_contributions TO service_role;

ALTER TABLE public.saving_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own contribs select" ON public.saving_contributions;
DROP POLICY IF EXISTS "own contribs insert" ON public.saving_contributions;
DROP POLICY IF EXISTS "own contribs update" ON public.saving_contributions;
DROP POLICY IF EXISTS "own contribs delete" ON public.saving_contributions;

CREATE POLICY "own contribs select" ON public.saving_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own contribs insert" ON public.saving_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contribs update" ON public.saving_contributions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contribs delete" ON public.saving_contributions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saving_contributions_goal_idx ON public.saving_contributions(goal_id);
CREATE INDEX IF NOT EXISTS saving_contributions_user_idx ON public.saving_contributions(user_id);

-- Trigger: keep saving_goals.saved_amount = SUM(contributions.amount)
CREATE OR REPLACE FUNCTION public.recompute_goal_saved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid;
BEGIN
  gid := COALESCE(NEW.goal_id, OLD.goal_id);
  UPDATE public.saving_goals
     SET saved_amount = COALESCE(
       (SELECT SUM(amount) FROM public.saving_contributions WHERE goal_id = gid), 0)
   WHERE id = gid;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_contrib_aiud ON public.saving_contributions;
CREATE TRIGGER trg_contrib_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.saving_contributions
FOR EACH ROW EXECUTE FUNCTION public.recompute_goal_saved();
