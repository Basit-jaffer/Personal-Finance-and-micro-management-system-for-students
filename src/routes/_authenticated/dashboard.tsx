import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard, listExpenses, listCategories } from "@/lib/finance.functions";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowUpRight, AlertTriangle, TrendingUp, Wallet, Receipt, Activity,
  ShieldCheck, Plus, ArrowDownRight, Sparkles, PiggyBank, FileBarChart, Target,
  ArrowRight, ListFilter,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { AppShell, requireAuth } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  beforeLoad: requireAuth,
  component: Dashboard,
});

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: "decimal", maximumFractionDigits: 2 }).format(n);
}

const ACTION_LABEL: Record<string, string> = {
  expense_added: "Expense added",
  expense_updated: "Expense updated",
  expense_deleted: "Expense deleted",
  category_created: "Category created",
  category_modified: "Category modified",
  category_deleted: "Category deleted",
  income_set: "Income set",
  income_added: "Income added",
  income_updated: "Income updated",
  income_deleted: "Income deleted",
  contribution_added: "Savings contribution",
  contribution_deleted: "Contribution removed",
  goal_created: "Savings goal created",
  goal_updated: "Savings goal updated",
  report_generated: "Monthly report generated",
};

function Dashboard() {
  const { email } = Route.useRouteContext();
  return (
    <AppShell email={email}>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const fetcher = useServerFn(getDashboard);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", year, month],
    queryFn: () => fetcher({ data: { year, month } }),
  });

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, { month: "long", year: "numeric" });

  if (isLoading || !data) return <DashboardSkeleton monthName={monthName} />;

  const alerts = data.category_breakdown.filter((c) => c.status !== "ok");
  const spendRatio = data.total_income > 0 ? Math.min(100, (data.total_spent / data.total_income) * 100) : 0;
  const remainingPositive = data.remaining >= 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-grad-hero text-white p-6 lg:p-10 shadow-lift">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/80">
              <Sparkles className="size-3 text-accent" />
              {monthName}
            </div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tight text-white">
              {remainingPositive ? "You're on track." : "Time to recalibrate."}
            </h1>
            <p className="text-white/60 text-sm max-w-md">
              {remainingPositive
                ? `${fmt(data.remaining)} available after spending${(data.total_savings ?? 0) > 0 ? " and savings" : ""} this month.`
                : `Over budget by ${fmt(Math.abs(data.remaining))} — spending${(data.total_savings ?? 0) > 0 ? " plus savings" : ""} exceed income.`}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-white/90 shadow-sm">
                <Link to="/expenses"><Plus className="size-4" /> Add expense</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.1] hover:text-white">
                <Link to="/budgets"><PiggyBank className="size-4" /> New category</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.1] hover:text-white">
                <Link to="/savings"><Target className="size-4" /> Savings goals</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.1] hover:text-white">
                <Link to="/reports"><FileBarChart className="size-4" /> Monthly report</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:gap-4 lg:min-w-[420px]">
            <HeroStat label="Remaining" value={fmt(Math.abs(data.remaining))} tone={remainingPositive ? "good" : "bad"} sign={remainingPositive ? "+" : "−"} />
            <HeroStat label="Forecast EOM" value={fmt(Math.abs(data.forecast_remaining))} tone={data.forecast_remaining >= 0 ? "good" : "bad"} sign={data.forecast_remaining >= 0 ? "+" : "−"} />
          </div>
        </div>

        {/* Spend gauge */}
        <div className="relative mt-8">
          <div className="flex justify-between text-xs text-white/60 mb-2 num">
            <span>Spent {fmt(data.total_spent)}</span>
            <span>Income {fmt(data.total_income)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-grad-accent transition-all duration-700 ease-out"
              style={{ width: `${spendRatio}%` }}
            />
          </div>
          <div className="text-[11px] text-white/50 mt-2 num">{Math.round(spendRatio)}% of income spent</div>
        </div>
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle className="text-destructive">
            {alerts.length} budget {alerts.length === 1 ? "alert" : "alerts"}
          </AlertTitle>
          <AlertDescription className="space-y-1 mt-1">
            {alerts.map((a) => (
              <div key={a.id} className="text-sm flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{a.name}</span>
                <span className="text-muted-foreground num">
                  {fmt(a.spent)} / {fmt(a.budget)}
                </span>
                <Badge variant={a.status === "exceeded" ? "destructive" : "secondary"} className="text-[10px]">
                  {a.status === "exceeded" ? "Over budget" : `${Math.round(a.ratio * 100)}%`}
                </Badge>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPI
          icon={<Wallet className="size-4" />}
          label="Total income"
          value={fmt(data.total_income)}
          trend="up"
        />
        <KPI
          icon={<Receipt className="size-4" />}
          label="Spent"
          value={fmt(data.total_spent)}
          trend="down"
        />
        <KPI
          icon={<PiggyBank className="size-4" />}
          label="Saved"
          value={fmt(data.total_savings ?? 0)}
        />
        <KPI
          icon={<ShieldCheck className="size-4" />}
          label="Available"
          value={fmt(data.remaining)}
          tone={data.remaining < 0 ? "danger" : "success"}
          sub="Income − Spent − Saved"
        />
        <KPI
          icon={<TrendingUp className="size-4" />}
          label="Forecast EOM"
          value={fmt(data.forecast_remaining)}
          tone={data.forecast_remaining < 0 ? "danger" : "default"}
          sub={`Spend ≈ ${fmt(data.forecast_spend)}`}
        />
      </div>


      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card border-border/60 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <div>
              <CardTitle className="text-base">Spending by category</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Budget vs. actual this month</p>
            </div>
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <Link to="/budgets"><Plus className="size-3.5" /> Add category</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.category_breakdown.length === 0 ? (
              <EmptyState
                title="No categories yet"
                description="Create your first budget category to see spending insights."
                action={<Link to="/budgets" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Plus className="size-4" />Create category</Link>}
              />
            ) : (
              <>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.category_breakdown} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={1} />
                          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                      <Tooltip
                        cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12,
                          boxShadow: "var(--shadow-card)",
                        }}
                      />
                      <Bar dataKey="budget" fill="var(--color-muted)" name="Budget" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="spent" fill="url(#spentGrad)" name="Spent" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4 pt-2 border-t border-border/60">
                  {data.category_breakdown.map((c) => {
                    const pct = Math.min(100, c.ratio * 100);
                    return (
                      <div key={c.id} className="group">
                        <div className="flex justify-between items-center text-sm mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{c.name}</span>
                            {c.status === "exceeded" && (
                              <Badge variant="destructive" className="text-[10px] h-5">Over</Badge>
                            )}
                            {c.status === "warn" && (
                              <Badge className="bg-warning/15 text-warning-foreground border-warning/30 text-[10px] h-5">Near limit</Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground num text-xs shrink-0">
                            <span className="text-foreground font-medium">{fmt(c.spent)}</span> / {fmt(c.budget)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              c.status === "exceeded"
                                ? "bg-destructive"
                                : c.status === "warn"
                                ? "bg-warning"
                                : "bg-grad-accent"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="shadow-card border-border/60">
          <CardHeader className="pb-4 flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4 text-accent" /> Recent activity
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Latest changes in your account</p>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
              <Link to="/expenses"><Plus className="size-3.5" /> Log</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recent_activity.length === 0 ? (
              <EmptyState
                compact
                title="No activity yet"
                description="Start by adding an expense or creating a category."
              />
            ) : (
              <ol className="relative space-y-4">
                {data.recent_activity.map((a, i) => (
                  <li key={a.id} className="relative flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className="size-2 rounded-full bg-accent ring-4 ring-accent/15 mt-1.5" />
                      {i < data.recent_activity.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-1 min-w-0">
                      <div className="text-sm font-medium leading-snug">
                        {ACTION_LABEL[a.action] ?? a.action}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 num">
                        {new Date(a.created_at).toLocaleString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entries list with filters */}
      <EntriesSection year={year} month={month} />

      {/* Quick links to other sections */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QuickLinkCard
          to="/savings"
          icon={<Target className="size-5" />}
          title="Savings goals"
          description="Track progress toward what you're saving for."
        />
        <QuickLinkCard
          to="/reports"
          icon={<FileBarChart className="size-5" />}
          title="Monthly report"
          description="AI-generated summary, forecast and breakdown."
        />
      </div>
    </div>
  );
}

function QuickLinkCard({
  to, icon, title, description,
}: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card hover:shadow-lift hover:-translate-y-0.5 transition-all flex items-center gap-4"
    >
      <div className="size-11 rounded-xl bg-accent/10 text-accent grid place-items-center group-hover:bg-accent group-hover:text-accent-foreground transition">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition" />
    </Link>
  );
}

type Range = "today" | "week" | "month";

function EntriesSection({ year, month }: { year: number; month: number }) {
  const [range, setRange] = useState<Range>("month");
  const list = useServerFn(listExpenses);
  const listCats = useServerFn(listCategories);

  const expensesQuery = useQuery({
    queryKey: ["expenses", year, month],
    queryFn: () => list({ data: { year, month } }),
  });
  const catQuery = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });
  const catMap = useMemo(
    () => new Map((catQuery.data ?? []).map((c) => [c.id, c.name])),
    [catQuery.data],
  );

  const filtered = useMemo(() => {
    const all = expensesQuery.data ?? [];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
    return all.filter((e) => {
      if (range === "today") return e.spent_at === today;
      if (range === "week") return e.spent_at >= weekAgo;
      return true;
    });
  }, [expensesQuery.data, range]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <Card className="shadow-card border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ListFilter className="size-4 text-accent" /> Your entries
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · {fmt(total)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <Link to="/expenses"><Plus className="size-3.5" /> Add</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState
            title="No entries in this range"
            description="Switch the filter or add a new expense to see it here."
            action={
              <Link to="/expenses" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                <Plus className="size-4" /> Add expense
              </Link>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground num text-xs">{e.spent_at}</TableCell>
                  <TableCell className="font-medium">{e.description || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {e.category_id ? catMap.get(e.category_id) ?? "—" : "Uncategorized"}
                  </TableCell>
                  <TableCell className="text-right num font-medium">{fmt(Number(e.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function HeroStat({
  label, value, tone, sign,
}: { label: string; value: string; tone: "good" | "bad"; sign: string }) {
  const Icon = tone === "good" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur p-4 hover:bg-white/[0.06] transition">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`text-xs ${tone === "good" ? "text-accent" : "text-destructive"}`}>{sign}</span>
        <span className="text-2xl font-semibold text-white num">{value}</span>
      </div>
      <div className={`mt-1 inline-flex items-center gap-1 text-[10px] ${tone === "good" ? "text-accent" : "text-destructive"}`}>
        <Icon className="size-3" /> {tone === "good" ? "Healthy" : "Watch out"}
      </div>
    </div>
  );
}

function KPI({
  icon, label, value, sub, tone = "default", trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "danger";
  trend?: "up" | "down";
}) {
  const toneClass =
    tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card className="group relative overflow-hidden border-border/60 shadow-card hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
            {label}
          </span>
          <div className="size-8 rounded-lg bg-muted/70 text-muted-foreground grid place-items-center group-hover:bg-accent/15 group-hover:text-accent transition">
            {icon}
          </div>
        </div>
        <div className={`mt-3 text-[26px] leading-none font-semibold tracking-tight num ${toneClass}`}>
          {value}
        </div>
        {sub ? (
          <div className="mt-2 text-xs text-muted-foreground num">{sub}</div>
        ) : trend ? (
          <div className={`mt-2 inline-flex items-center gap-1 text-[11px] ${trend === "up" ? "text-success" : "text-muted-foreground"}`}>
            {trend === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            <span>This month</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title, description, action, compact,
}: { title: string; description: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"}`}>
      <div className="size-12 rounded-2xl bg-muted grid place-items-center mb-3">
        <Sparkles className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function DashboardSkeleton({ monthName }: { monthName: string }) {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-grad-hero p-10 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-white/60">{monthName}</div>
        <Skeleton className="h-10 w-64 mt-3 bg-white/10" />
        <Skeleton className="h-4 w-80 mt-3 bg-white/10" />
        <Skeleton className="h-2 w-full mt-8 bg-white/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
