import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// Helpers
// ============================================================================

const MonthInput = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const days_in_month = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    days_in_month,
  };
}

async function logActivity(
  supabase: any,
  userId: string,
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("activity_log").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    metadata,
  });
}

// ============================================================================
// Categories
// ============================================================================

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(60),
        monthly_budget: z.number().min(0).max(1_000_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      name: data.name,
      monthly_budget: data.monthly_budget,
    };
    let result;
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("categories")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = updated;
      await logActivity(context.supabase, context.userId, "category_modified", "categories", result.id, { name: data.name });
    } else {
      const { data: inserted, error } = await context.supabase
        .from("categories")
        .insert(row)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = inserted;
      await logActivity(context.supabase, context.userId, "category_created", "categories", result.id, { name: data.name });
    }
    return result;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("categories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "category_deleted", "categories", data.id);
    return { ok: true };
  });

// ============================================================================
// Income
// ============================================================================

export const getCurrentIncome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MonthInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("incomes")
      .select("*")
      .eq("user_id", context.userId)
      .eq("year", data.year)
      .eq("month", data.month)
      .order("occurred_on", { ascending: false });
    if (error) throw new Error(error.message);
    const total = (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);
    return { rows: rows ?? [], total };
  });

const IncomeInput = z.object({
  amount: z.number().positive().max(1_000_000_000),
  source: z.string().trim().min(1).max(60),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().max(500).optional().nullable(),
});

export const addIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IncomeInput.parse(d))
  .handler(async ({ data, context }) => {
    const d = new Date(data.occurred_on + "T00:00:00Z");
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const { data: row, error } = await context.supabase
      .from("incomes")
      .insert({
        user_id: context.userId,
        year, month,
        amount: data.amount,
        source: data.source,
        occurred_on: data.occurred_on,
        description: data.description ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "income_added", "incomes", row.id, {
      amount: data.amount, source: data.source,
    });
    return row;
  });

export const updateIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    IncomeInput.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const update: Database["public"]["Tables"]["incomes"]["Update"] = { ...patch };
    if (patch.occurred_on) {
      const d2 = new Date(patch.occurred_on + "T00:00:00Z");
      update.year = d2.getUTCFullYear();
      update.month = d2.getUTCMonth() + 1;
    }
    const { data: row, error } = await context.supabase
      .from("incomes")
      .update(update)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "income_updated", "incomes", id, {});
    return row;
  });

export const deleteIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("incomes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "income_deleted", "incomes", data.id);
    return { ok: true };
  });

// Back-compat shim: existing UI may still call upsertIncome (single allowance).
// Adds a new income entry rather than overwriting.
export const upsertIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
      amount: z.number().min(0).max(1_000_000_000),
      source: z.string().trim().min(1).max(60).default("allowance"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const occurred_on = new Date(Date.UTC(data.year, data.month - 1, 1))
      .toISOString().slice(0, 10);
    const { data: row, error } = await context.supabase
      .from("incomes")
      .insert({
        user_id: context.userId,
        year: data.year, month: data.month,
        amount: data.amount, source: data.source,
        occurred_on,
      })
      .select().single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "income_added", "incomes", row.id, {
      amount: data.amount, source: data.source,
    });
    return row;
  });


// ============================================================================
// Expenses
// ============================================================================

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MonthInput.parse(d))
  .handler(async ({ data, context }) => {
    const { start, end } = monthRange(data.year, data.month);
    const { data: rows, error } = await context.supabase
      .from("expenses")
      .select("*")
      .eq("user_id", context.userId)
      .gte("spent_at", start)
      .lt("spent_at", end)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const ExpenseInput = z.object({
  amount: z.number().min(0).max(1_000_000_000),
  description: z.string().trim().max(500).default(""),
  category_id: z.string().uuid().nullable(),
  spent_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ai_suggested_category_id: z.string().uuid().nullable().optional(),
});

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExpenseInput.parse(d))
  .handler(async ({ data, context }) => {
    const corrected =
      !!data.ai_suggested_category_id &&
      data.ai_suggested_category_id !== data.category_id;
    const { data: row, error } = await context.supabase
      .from("expenses")
      .insert({
        user_id: context.userId,
        amount: data.amount,
        description: data.description,
        category_id: data.category_id,
        spent_at: data.spent_at,
        ai_suggested_category_id: data.ai_suggested_category_id ?? null,
        user_corrected: corrected,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "expense_added", "expenses", row.id, {
      amount: data.amount,
      description: data.description,
    });
    return row;
  });

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    ExpenseInput.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    let user_corrected: boolean | undefined;
    if (patch.category_id !== undefined) {
      const { data: existing } = await context.supabase
        .from("expenses")
        .select("ai_suggested_category_id")
        .eq("id", id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (
        existing?.ai_suggested_category_id &&
        existing.ai_suggested_category_id !== patch.category_id
      ) {
        user_corrected = true;
      }
    }
    const { data: row, error } = await context.supabase
      .from("expenses")
      .update({ ...patch, ...(user_corrected !== undefined ? { user_corrected } : {}) })
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "expense_updated", "expenses", id, {});
    return row;
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expenses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "expense_deleted", "expenses", data.id);
    return { ok: true };
  });

// ============================================================================
// Savings goals
// ============================================================================

export const listGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saving_goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80),
        target_amount: z.number().positive().max(1_000_000_000),
        saved_amount: z.number().min(0).max(1_000_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      name: data.name,
      target_amount: data.target_amount,
      saved_amount: data.saved_amount,
    };
    let result;
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("saving_goals")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = updated;
      await logActivity(context.supabase, context.userId, "goal_updated", "saving_goals", result.id, { name: data.name });
    } else {
      const { data: inserted, error } = await context.supabase
        .from("saving_goals")
        .insert(row)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = inserted;
      await logActivity(context.supabase, context.userId, "goal_created", "saving_goals", result.id, { name: data.name });
    }
    return result;
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saving_goals")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Dashboard (calculations)
// ============================================================================

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MonthInput.parse(d))
  .handler(async ({ data, context }) => {
    const { start, end, days_in_month } = monthRange(data.year, data.month);
    const [catRes, incRes, expRes, actRes] = await Promise.all([
      context.supabase.from("categories").select("*").order("name"),
      context.supabase
        .from("incomes")
        .select("amount")
        .eq("user_id", context.userId)
        .eq("year", data.year)
        .eq("month", data.month),
      context.supabase
        .from("expenses")
        .select("id,amount,category_id,spent_at,description")
        .eq("user_id", context.userId)
        .gte("spent_at", start)
        .lt("spent_at", end),
      context.supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (catRes.error) throw new Error(catRes.error.message);
    if (incRes.error) throw new Error(incRes.error.message);
    if (expRes.error) throw new Error(expRes.error.message);
    if (actRes.error) throw new Error(actRes.error.message);

    const categories = catRes.data ?? [];
    const expenses = expRes.data ?? [];
    const total_income = (incRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const total_spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const remaining = total_income - total_spent;

    const today = new Date();
    const inThisMonth =
      today.getUTCFullYear() === data.year && today.getUTCMonth() + 1 === data.month;
    const days_passed = inThisMonth ? Math.max(1, today.getUTCDate()) : days_in_month;
    const forecast_spend =
      days_passed > 0 ? (total_spent / days_passed) * days_in_month : 0;
    const forecast_remaining = total_income - forecast_spend;

    const category_breakdown = categories.map((c) => {
      const spent = expenses
        .filter((e) => e.category_id === c.id)
        .reduce((s, e) => s + Number(e.amount), 0);
      const budget = Number(c.monthly_budget);
      const ratio = budget > 0 ? spent / budget : 0;
      const status = ratio >= 1 ? "exceeded" : ratio >= 0.8 ? "warn" : "ok";
      return {
        id: c.id,
        name: c.name,
        budget,
        spent,
        remaining: budget - spent,
        ratio,
        status,
      };
    });

    const uncategorized_spent = expenses
      .filter((e) => !e.category_id)
      .reduce((s, e) => s + Number(e.amount), 0);

    return {
      year: data.year,
      month: data.month,
      total_income,
      total_spent,
      remaining,
      forecast_spend,
      forecast_remaining,
      days_in_month,
      days_passed,
      category_breakdown,
      uncategorized_spent,
      recent_activity: actRes.data ?? [],
    };
  });

// ============================================================================
// AI: categorize, parse NL, summarize
// ============================================================================

export const suggestCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        description: z.string().trim().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: cats, error } = await context.supabase
      .from("categories")
      .select("id,name");
    if (error) throw new Error(error.message);
    const categories = cats ?? [];
    if (categories.length === 0) return { category_id: null, reason: "no categories" };

    const { callAIJson } = await import("./ai-gateway.server");
    const list = categories.map((c) => `- ${c.name}`).join("\n");
    const result = await callAIJson<{ category_name: string }>([
      {
        role: "system",
        content:
          "You categorize student expenses. Pick exactly one category name from the list. Reply ONLY in JSON: {\"category_name\": \"<name>\"}. If none fit, pick the closest. This is a suggestion only.",
      },
      {
        role: "user",
        content: `Categories:\n${list}\n\nExpense: ${data.description}`,
      },
    ]);
    const match = categories.find(
      (c) => c.name.toLowerCase() === (result.category_name ?? "").toLowerCase(),
    );
    return { category_id: match?.id ?? null, category_name: match?.name ?? null };
  });

export const parseExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sentence: z.string().trim().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: cats, error } = await context.supabase
      .from("categories")
      .select("id,name");
    if (error) throw new Error(error.message);
    const categories = cats ?? [];

    const { callAIJson } = await import("./ai-gateway.server");
    const list = categories.map((c) => `- ${c.name}`).join("\n") || "(none)";
    const result = await callAIJson<{
      amount: number;
      description: string;
      category_name: string | null;
      spent_at: string | null;
    }>([
      {
        role: "system",
        content:
          'Extract an expense from natural language. Reply ONLY in JSON: {"amount": <number>, "description": "<short>", "category_name": "<one of provided or null>", "spent_at": "YYYY-MM-DD or null"}. Today is ' +
          new Date().toISOString().slice(0, 10) +
          ". Currency-agnostic; amount is the bare number. This is a suggestion only.",
      },
      {
        role: "user",
        content: `Categories:\n${list}\n\nSentence: ${data.sentence}`,
      },
    ]);
    const match = categories.find(
      (c) => c.name.toLowerCase() === (result.category_name ?? "").toLowerCase(),
    );
    return {
      amount: Number(result.amount) || 0,
      description: String(result.description ?? data.sentence).slice(0, 500),
      category_id: match?.id ?? null,
      spent_at: result.spent_at && /^\d{4}-\d{2}-\d{2}$/.test(result.spent_at)
        ? result.spent_at
        : new Date().toISOString().slice(0, 10),
    };
  });

// ============================================================================
// Monthly Report
// ============================================================================

export const generateMonthlyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MonthInput.parse(d))
  .handler(async ({ data, context }) => {
    // Re-use dashboard math
    const { start, end, days_in_month } = monthRange(data.year, data.month);
    const [catRes, incRes, expRes] = await Promise.all([
      context.supabase.from("categories").select("*"),
      context.supabase
        .from("incomes")
        .select("amount")
        .eq("user_id", context.userId)
        .eq("year", data.year)
        .eq("month", data.month),
      context.supabase
        .from("expenses")
        .select("amount,category_id,description,spent_at")
        .eq("user_id", context.userId)
        .gte("spent_at", start)
        .lt("spent_at", end),
    ]);
    if (catRes.error) throw new Error(catRes.error.message);
    if (incRes.error) throw new Error(incRes.error.message);
    if (expRes.error) throw new Error(expRes.error.message);

    const categories = catRes.data ?? [];
    const expenses = expRes.data ?? [];
    const total_income = (incRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const total_spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const remaining = total_income - total_spent;

    const today = new Date();
    const inThisMonth =
      today.getUTCFullYear() === data.year && today.getUTCMonth() + 1 === data.month;
    const days_passed = inThisMonth ? Math.max(1, today.getUTCDate()) : days_in_month;
    const forecast_spend =
      days_passed > 0 ? (total_spent / days_passed) * days_in_month : 0;
    const forecast_remaining = total_income - forecast_spend;

    const breakdown = categories.map((c) => {
      const spent = expenses
        .filter((e) => e.category_id === c.id)
        .reduce((s, e) => s + Number(e.amount), 0);
      return {
        name: c.name,
        budget: Number(c.monthly_budget),
        spent,
        remaining: Number(c.monthly_budget) - spent,
      };
    });

    const { callAI } = await import("./ai-gateway.server");
    let ai_summary = "AI summary unavailable.";
    try {
      ai_summary = await callAI(
        [
          {
            role: "system",
            content:
              "You write short, friendly monthly spending summaries for students (max 6 sentences). End with one practical, non-prescriptive saving suggestion. Always remind that this is a suggestion, not financial advice.",
          },
          {
            role: "user",
            content: JSON.stringify({
              year: data.year,
              month: data.month,
              total_income,
              total_spent,
              remaining,
              forecast_spend,
              forecast_remaining,
              breakdown,
            }),
          },
        ],
        { temperature: 0.5 },
      );
    } catch (e) {
      ai_summary = `AI summary unavailable: ${(e as Error).message}`;
    }

    const { data: row, error } = await context.supabase
      .from("monthly_reports")
      .upsert(
        {
          user_id: context.userId,
          year: data.year,
          month: data.month,
          total_income,
          total_spent,
          remaining,
          forecast_spend,
          forecast_remaining,
          category_breakdown: breakdown,
          ai_summary,
        },
        { onConflict: "user_id,year,month" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, context.userId, "report_generated", "monthly_reports", row.id, {
      year: data.year,
      month: data.month,
    });
    return row;
  });

export const getMonthlyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MonthInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("monthly_reports")
      .select("*")
      .eq("user_id", context.userId)
      .eq("year", data.year)
      .eq("month", data.month)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ============================================================================
// Privacy: delete all my data
// ============================================================================

export const deleteAllMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tables = [
      "expenses",
      "categories",
      "incomes",
      "saving_goals",
      "monthly_reports",
      "activity_log",
    ] as const;
    for (const t of tables) {
      const { error } = await context.supabase
        .from(t)
        .delete()
        .eq("user_id", context.userId);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
    return { ok: true };
  });
