import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGoals, upsertGoal, deleteGoal } from "@/lib/finance.functions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";
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

  const goalsQuery = useQuery({ queryKey: ["goals"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");

  const addMut = useMutation({
    mutationFn: () => save({
      data: {
        name: name.trim(),
        target_amount: Number(target),
        saved_amount: Number(saved || "0"),
      },
    }),
    onSuccess: () => {
      toast.success("Saving goal saved");
      setName(""); setTarget(""); setSaved("");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updMut = useMutation({
    mutationFn: (v: { id: string; name: string; target_amount: number; saved_amount: number }) =>
      save({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Goal deleted");
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Savings goals</h1>
        <p className="text-muted-foreground text-sm">Track what you're saving towards.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New goal</CardTitle>
          <CardDescription>Name your goal and set a target.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const t = Number(target);
              if (!name.trim()) return toast.error("Name required");
              if (!Number.isFinite(t) || t <= 0) return toast.error("Target must be > 0");
              addMut.mutate();
            }}
          >
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Name</Label>
              <Input placeholder="New laptop" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target</Label>
              <Input type="number" min="0.01" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saved so far</Label>
              <Input type="number" min="0" step="0.01" value={saved} onChange={(e) => setSaved(e.target.value)} />
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <Button type="submit" disabled={addMut.isPending}>
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
            onUpdate={(saved_amount) =>
              updMut.mutate({
                id: g.id,
                name: g.name,
                target_amount: Number(g.target_amount),
                saved_amount,
              })
            }
            onDelete={() => confirm(`Delete "${g.name}"?`) && delMut.mutate(g.id)}
            saving={updMut.isPending}
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
  onUpdate,
  onDelete,
  saving,
}: {
  goal: { id: string; name: string; target_amount: number | string; saved_amount: number | string };
  onUpdate: (saved_amount: number) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const savedNow = Number(goal.saved_amount);
  const targetNum = Number(goal.target_amount);
  const pct = Math.min(100, (savedNow / targetNum) * 100);
  const [add, setAdd] = useState("");
  const reached = savedNow >= targetNum;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold">{goal.name}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {savedNow.toFixed(2)} of {targetNum.toFixed(2)}
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
            <span>{Math.max(0, targetNum - savedNow).toFixed(2)} to go</span>
          </div>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(add);
            if (!Number.isFinite(n) || n <= 0) return toast.error("Enter an amount > 0");
            onUpdate(savedNow + n);
            setAdd("");
          }}
        >
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder={reached ? "Goal reached 🎉" : "Add money"}
            value={add}
            onChange={(e) => setAdd(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={saving || !add}>
            Add
          </Button>
        </form>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Edit saved amount</summary>
          <div className="flex gap-2 mt-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              defaultValue={savedNow}
              className="h-8"
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 0 && n !== savedNow) onUpdate(n);
              }}
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
    </div>
  );
}
