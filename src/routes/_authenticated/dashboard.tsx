import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowUpRight, AlertTriangle, TrendingUp, Wallet, Receipt, Activity, ShieldCheck } from "lucide-react";
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

  if (isLoading || !data) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  const alerts = data.category_breakdown.filter((c) => c.status !== "ok");
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{monthName}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/expenses" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Add expense <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Budget alerts</AlertTitle>
          <AlertDescription>
            {alerts.map((a) => (
              <div key={a.id} className="text-sm">
                <strong>{a.name}</strong>: {fmt(a.spent)} / {fmt(a.budget)} ({Math.round(a.ratio * 100)}%) —{" "}
                {a.status === "exceeded" ? "over budget" : "approaching limit"}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI icon={<Wallet className="size-4" />} label="Monthly income" value={fmt(data.total_income)} />
        <KPI icon={<Receipt className="size-4" />} label="Spent so far" value={fmt(data.total_spent)} />
        <KPI
          icon={<ShieldCheck className="size-4" />}
          label="Remaining balance"
          value={fmt(data.remaining)}
          tone={data.remaining < 0 ? "danger" : "success"}
        />
        <KPI
          icon={<TrendingUp className="size-4" />}
          label="Forecast end-of-month"
          value={fmt(data.forecast_remaining)}
          tone={data.forecast_remaining < 0 ? "danger" : "default"}
          sub={`Spend ≈ ${fmt(data.forecast_spend)} of ${fmt(data.total_income)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.category_breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet. <Link to="/budgets" className="text-primary underline">Create one</Link>.
              </p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.category_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="budget" fill="var(--color-muted-foreground)" opacity={0.3} name="Budget" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="spent" fill="var(--color-accent)" name="Spent" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {data.category_breakdown.map((c) => (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.status === "exceeded" && <Badge variant="destructive">Over</Badge>}
                          {c.status === "warn" && <Badge className="bg-warning text-warning-foreground">80%</Badge>}
                        </div>
                        <span className="text-muted-foreground">
                          {fmt(c.spent)} / {fmt(c.budget)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, c.ratio * 100)} className="mt-1" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.recent_activity.map((a) => (
                  <li key={a.id} className="text-sm flex justify-between gap-2">
                    <span>{ACTION_LABEL[a.action] ?? a.action}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({
  icon, label, value, sub, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
          <span>{label}</span>
          {icon}
        </div>
        <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
