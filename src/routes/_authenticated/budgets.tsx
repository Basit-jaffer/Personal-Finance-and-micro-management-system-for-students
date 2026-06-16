import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentIncome, upsertIncome,
  listCategories, upsertCategory, deleteCategory,
} from "@/lib/finance.functions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell, requireAuth } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/budgets")({
  ssr: false,
  beforeLoad: requireAuth,
  component: BudgetsPage,
});

function BudgetsPage() {
  const { email } = Route.useRouteContext();
  return (
    <AppShell email={email}>
      <BudgetsContent />
    </AppShell>
  );
}

function BudgetsContent() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const qc = useQueryClient();

  const getIncome = useServerFn(getCurrentIncome);
  const setIncome = useServerFn(upsertIncome);
  const listCats = useServerFn(listCategories);
  const upsertCat = useServerFn(upsertCategory);
  const deleteCat = useServerFn(deleteCategory);

  const incomeQuery = useQuery({
    queryKey: ["income", year, month],
    queryFn: () => getIncome({ data: { year, month } }),
  });
  const catQuery = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });

  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const incomeMut = useMutation({
    mutationFn: (amount: number) =>
      setIncome({ data: { year, month, amount, source: "allowance" } }),
    onSuccess: () => {
      toast.success("Monthly income saved");
      qc.invalidateQueries({ queryKey: ["income", year, month] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [catName, setCatName] = useState("");
  const [catBudget, setCatBudget] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const catMut = useMutation({
    mutationFn: (input: { id?: string; name: string; monthly_budget: number }) =>
      upsertCat({ data: input }),
    onSuccess: () => {
      toast.success(editingId ? "Category updated" : "Category created");
      setCatName(""); setCatBudget(""); setEditingId(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCat({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground text-sm">Set this month's income and category limits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly income / allowance</CardTitle>
          <CardDescription>
            Current: <strong>{incomeQuery.data?.total ?? 0}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(incomeAmount);
              if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid amount");
              incomeMut.mutate(n);
            }}
          >
            <Input
              type="number" min="0" step="0.01" placeholder="e.g. 500"
              value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)}
              required
            />
            <Button type="submit" disabled={incomeMut.isPending}>
              {incomeMut.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Create spending categories and set monthly limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid sm:grid-cols-[1fr_180px_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(catBudget);
              if (!catName.trim()) return toast.error("Name required");
              if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid budget");
              catMut.mutate({
                id: editingId ?? undefined,
                name: catName.trim(),
                monthly_budget: n,
              });
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input placeholder="Food" value={catName} onChange={(e) => setCatName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly budget</Label>
              <Input type="number" min="0" step="0.01" placeholder="200" value={catBudget} onChange={(e) => setCatBudget(e.target.value)} required />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={catMut.isPending}>
                {editingId ? "Save" : "Add"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setCatName(""); setCatBudget(""); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Monthly budget</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(catQuery.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{Number(c.monthly_budget)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => {
                        setEditingId(c.id);
                        setCatName(c.name);
                        setCatBudget(String(c.monthly_budget));
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => confirm(`Delete category "${c.name}"?`) && delMut.mutate(c.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(catQuery.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    No categories yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
