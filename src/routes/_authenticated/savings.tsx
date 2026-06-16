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

export const Route = createFileRoute("/_authenticated/savings")({
  component: SavingsPage,
});

function SavingsPage() {
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
        {(goalsQuery.data ?? []).map((g) => {
          const pct = Math.min(100, (Number(g.saved_amount) / Number(g.target_amount)) * 100);
          return (
            <Card key={g.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {Number(g.saved_amount)} of {Number(g.target_amount)}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${g.name}"?`) && delMut.mutate(g.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <Progress value={pct} />
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="0" step="0.01" defaultValue={Number(g.saved_amount)}
                    className="h-8"
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n >= 0 && n !== Number(g.saved_amount)) {
                        updMut.mutate({
                          id: g.id, name: g.name,
                          target_amount: Number(g.target_amount), saved_amount: n,
                        });
                      }
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(goalsQuery.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No savings goals yet.</p>
        )}
      </div>
    </div>
  );
}
