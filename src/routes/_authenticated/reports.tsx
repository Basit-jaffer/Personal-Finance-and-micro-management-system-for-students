import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateMonthlyReport, getMonthlyReport } from "@/lib/finance.functions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell, requireAuth } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  beforeLoad: requireAuth,
  component: ReportsPage,
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ReportsPage() {
  const { email } = Route.useRouteContext();
  return (
    <AppShell email={email}>
      <ReportsContent />
    </AppShell>
  );
}

function ReportsContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const qc = useQueryClient();

  const fetch = useServerFn(getMonthlyReport);
  const gen = useServerFn(generateMonthlyReport);

  const reportQuery = useQuery({
    queryKey: ["report", year, month],
    queryFn: () => fetch({ data: { year, month } }),
  });

  const genMut = useMutation({
    mutationFn: () => gen({ data: { year, month } }),
    onSuccess: () => {
      toast.success("Report generated");
      qc.invalidateQueries({ queryKey: ["report", year, month] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const r = reportQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monthly report</h1>
          <p className="text-muted-foreground text-sm">Forecast and AI-generated summary from your real data.</p>
        </div>
        <div className="flex gap-2 items-end">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => genMut.mutate()} disabled={genMut.isPending}>
            <Sparkles className="size-4 mr-1" />
            {genMut.isPending ? "Generating…" : r ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      {!r && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No report yet for {MONTHS[month - 1]} {year}. Click <strong>Generate</strong>.
          </CardContent>
        </Card>
      )}

      {r && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Income" value={Number(r.total_income)} />
            <Stat label="Spent" value={Number(r.total_spent)} />
            <Stat label="Remaining" value={Number(r.remaining)} tone={Number(r.remaining) < 0 ? "danger" : "success"} />
            <Stat label="Forecast spend" value={Number(r.forecast_spend)} />
            <Stat label="Forecast remaining" value={Number(r.forecast_remaining)} tone={Number(r.forecast_remaining) < 0 ? "danger" : "default"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" /> AI summary
              </CardTitle>
              <CardDescription>
                Generated {new Date(r.generated_at).toLocaleString()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.ai_summary}</p>
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  AI suggestions are informational only — not financial advice.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Category breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(r.category_breakdown as Array<{ name: string; budget: number; spent: number; remaining: number }>).map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(c.budget)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(c.spent)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${Number(c.remaining) < 0 ? "text-destructive" : ""}`}>
                        {Number(c.remaining)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
        <div className={`mt-2 text-xl font-semibold tabular-nums ${cls}`}>
          {new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}
        </div>
      </CardContent>
    </Card>
  );
}
