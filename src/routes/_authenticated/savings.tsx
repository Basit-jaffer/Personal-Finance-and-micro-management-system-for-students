import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listGoals, upsertGoal, deleteGoal,
  listContributions, addContribution, deleteContribution,
} from "@/lib/finance.functions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Trash2, PiggyBank, History } from "lucide-react";
import { toast } from "sonner";
import { AppShell, requireAuth } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/savings")({
  ssr: false,
  beforeLoad: requireAuth,
  component: SavingsPage,
});

function SavingsPage() {
  const { email } = Route.useRouteContext();
  return (
    <AppShell email={email}>
      <SavingsContent />
    </AppShell>
  );
}

function SavingsContent() {
  const qc = useQueryClient();
  const list = useServerFn(listGoals);
  const save = useServerFn(upsertGoal);
  const del = useServerFn(deleteGoal);
  const addContrib = useServerFn(addContribution);
  const delContrib = useServerFn(deleteContribution);
  const listContribs = useServerFn(listContributions);

  const goalsQuery = useQuery({ queryKey: ["goals"], queryFn: () => list() });
  const contribsQuery = useQuery({
    queryKey: ["contributions"],
    queryFn: () => listContribs({ data: {} }),
  });

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["contributions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const addMut = useMutation({
    mutationFn: () => save({
      data: { name: name.trim(), target_amount: Number(target) },
    }),
    onSuccess: () => {
      toast.success("Saving goal created");
      setName(""); setTarget("");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contribMut = useMutation({
    mutationFn: (v: { goal_id: string; amount: number }) => addContrib({ data: v }),
    onSuccess: () => {
      toast.success("Contribution added");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delContribMut = useMutation({
    mutationFn: (id: string) => delContrib({ data: { id } }),
    onSuccess: () => { toast.success("Contribution removed"); invalidateAll(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Goal deleted"); invalidateAll(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const contribsByGoal = (contribsQuery.data ?? []).reduce<Record<string, typeof contribsQuery.data extends (infer T)[] | undefined ? T[] : never>>((acc, c) => {
    (acc[c.goal_id] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Savings goals</h1>
        <p className="text-muted-foreground text-sm">
          Contributions reduce your available balance and grow toward each goal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New goal</CardTitle>
          <CardDescription>Name your goal and set a target.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_200px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const t = Number(target);
              if (!name.trim()) return toast.error("Name required");
              if (!Number.isFinite(t) || t <= 0) return toast.error("Target must be > 0");
              addMut.mutate();
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input placeholder="New laptop" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target</Label>
              <Input type="number" min="0.01" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={addMut.isPending} className="w-full">
                {addMut.isPending ? "Saving…" : "Add goal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(goalsQuery.data ?? []).map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            contributions={contribsByGoal[g.id] ?? []}
            onContribute={(amount) => contribMut.mutate({ goal_id: g.id, amount })}
            onDeleteContribution={(id) => delContribMut.mutate(id)}
            onDelete={() => confirm(`Delete "${g.name}"? This removes all its contributions.`) && delMut.mutate(g.id)}
            saving={contribMut.isPending}
          />
        ))}
        {(goalsQuery.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No savings goals yet.</p>
        )}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  contributions,
  onContribute,
  onDeleteContribution,
  onDelete,
  saving,
}: {
  goal: { id: string; name: string; target_amount: number | string; saved_amount: number | string };
  contributions: Array<{ id: string; amount: number | string; contributed_on: string; note: string | null }>;
  onContribute: (amount: number) => void;
  onDeleteContribution: (id: string) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const savedNow = Number(goal.saved_amount);
  const targetNum = Number(goal.target_amount);
  const pct = Math.min(100, (savedNow / targetNum) * 100);
  const remaining = Math.max(0, targetNum - savedNow);
  const [add, setAdd] = useState("");
  const [open, setOpen] = useState(false);
  const reached = savedNow >= targetNum;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-accent/10 grid place-items-center">
              <PiggyBank className="size-4 text-accent" />
            </div>
            <div>
              <div className="font-semibold leading-tight">{goal.name}</div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {savedNow.toFixed(2)} of {targetNum.toFixed(2)}
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>

        <div className="space-y-1">
          <Progress value={pct} />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{Math.round(pct)}%</span>
            <span>{remaining.toFixed(2)} to go</span>
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(add);
            if (!Number.isFinite(n) || n <= 0) return toast.error("Enter an amount > 0");
            onContribute(n);
            setAdd("");
          }}
        >
          <Input
            type="number" min="0.01" step="0.01"
            placeholder={reached ? "Goal reached 🎉 — add more?" : "Contribute"}
            value={add}
            onChange={(e) => setAdd(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={saving || !add}>Add</Button>
        </form>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          <History className="size-3" />
          {contributions.length} contribution{contributions.length === 1 ? "" : "s"} {open ? "▾" : "▸"}
        </button>
        {open && contributions.length > 0 && (
          <ul className="text-xs space-y-1 border-t pt-2">
            {contributions.map((c) => (
              <li key={c.id} className="flex justify-between items-center">
                <span className="text-muted-foreground tabular-nums">{c.contributed_on}</span>
                <span className="tabular-nums">+{Number(c.amount).toFixed(2)}</span>
                <button
                  onClick={() => onDeleteContribution(c.id)}
                  className="text-destructive hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
