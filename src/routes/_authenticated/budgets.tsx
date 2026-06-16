import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentIncome, addIncome, updateIncome, deleteIncome,
  listCategories, upsertCategory, deleteCategory,
} from "@/lib/finance.functions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, requireAuth } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/budgets")({
  ssr: false,
  beforeLoad: requireAuth,
  component: BudgetsPage,
});

const INCOME_SOURCES = [
  "Monthly Allowance",
  "Freelancing",
  "Scholarship",
  "Part-Time Job",
  "Gift",
  "Other",
];

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
  const addInc = useServerFn(addIncome);
  const updInc = useServerFn(updateIncome);
  const delInc = useServerFn(deleteIncome);
  const listCats = useServerFn(listCategories);
  const upsertCat = useServerFn(upsertCategory);
  const deleteCat = useServerFn(deleteCategory);

  const incomeQuery = useQuery({
    queryKey: ["income", year, month],
    queryFn: () => getIncome({ data: { year, month } }),
  });
  const catQuery = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });

  const invalidateIncome = () => {
    qc.invalidateQueries({ queryKey: ["income", year, month] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Monthly Allowance");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editSource, setEditSource] = useState("");

  const addIncMut = useMutation({
    mutationFn: () => addInc({
      data: {
        amount: Number(amount),
        source,
        occurred_on: occurredOn,
        description: description.trim() || null,
      },
    }),
    onSuccess: () => {
      toast.success("Income added");
      setAmount(""); setDescription("");
      invalidateIncome();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updIncMut = useMutation({
    mutationFn: (v: { id: string; amount: number; source: string }) =>
      updInc({ data: v }),
    onSuccess: () => {
      toast.success("Income updated");
      setEditingIncId(null);
      invalidateIncome();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delIncMut = useMutation({
    mutationFn: (id: string) => delInc({ data: { id } }),
    onSuccess: () => { toast.success("Income deleted"); invalidateIncome(); },
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
        <h1 className="text-2xl font-semibold tracking-tight">Budgets & income</h1>
        <p className="text-muted-foreground text-sm">Track multiple income sources and set category limits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This month's income</CardTitle>
          <CardDescription>
            Total: <strong className="tabular-nums">{Number(incomeQuery.data?.total ?? 0).toFixed(2)}</strong>
            {" "}across {incomeQuery.data?.rows.length ?? 0} entr{(incomeQuery.data?.rows.length ?? 0) === 1 ? "y" : "ies"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(amount);
              if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a valid amount");
              addIncMut.mutate();
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="500"
                value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Input placeholder="July paycheck" value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={addIncMut.isPending} className="w-full">
                {addIncMut.isPending ? "Adding…" : "Add income"}
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(incomeQuery.data?.rows ?? []).map((r) => {
                const isEditing = editingIncId === r.id;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{r.occurred_on}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editSource} onValueChange={setEditSource}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INCOME_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : r.source}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.description ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {isEditing ? (
                        <Input type="number" min="0.01" step="0.01" value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)} className="h-8" />
                      ) : Number(r.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="ghost"
                            onClick={() => {
                              const n = Number(editAmount);
                              if (!Number.isFinite(n) || n <= 0) return toast.error("Invalid amount");
                              updIncMut.mutate({ id: r.id, amount: n, source: editSource });
                            }}>
                            <Check className="size-4 text-success" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingIncId(null)}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingIncId(r.id);
                            setEditAmount(String(r.amount));
                            setEditSource(r.source);
                          }}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => confirm("Delete this income entry?") && delIncMut.mutate(r.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(incomeQuery.data?.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No income recorded for this month yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                  <TableCell className="tabular-nums">{Number(c.monthly_budget).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingId(c.id);
                      setCatName(c.name);
                      setCatBudget(String(c.monthly_budget));
                    }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => confirm(`Delete category "${c.name}"?`) && delMut.mutate(c.id)}>
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
