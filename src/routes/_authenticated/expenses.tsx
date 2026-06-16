import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listExpenses, addExpense, updateExpense, deleteExpense,
  listCategories, suggestCategory, parseExpense, upsertCategory,
} from "@/lib/finance.functions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Trash2, Sparkles, Wand2, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, requireAuth } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/expenses")({
  ssr: false,
  beforeLoad: requireAuth,
  component: ExpensesPage,
});

const UNCAT = "__uncat__";
const NEW_CAT = "__new__";

function todayISO() { return new Date().toISOString().slice(0, 10); }

function ExpensesPage() {
  const { email } = Route.useRouteContext();
  return (
    <AppShell email={email}>
      <ExpensesContent />
    </AppShell>
  );
}

function ExpensesContent() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const qc = useQueryClient();

  const list = useServerFn(listExpenses);
  const add = useServerFn(addExpense);
  const update = useServerFn(updateExpense);
  const del = useServerFn(deleteExpense);
  const listCats = useServerFn(listCategories);
  const suggest = useServerFn(suggestCategory);
  const parseNL = useServerFn(parseExpense);
  const upsertCat = useServerFn(upsertCategory);

  const expensesQuery = useQuery({
    queryKey: ["expenses", year, month],
    queryFn: () => list({ data: { year, month } }),
  });
  const catQuery = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(UNCAT);
  const [aiSuggested, setAiSuggested] = useState<string | null>(null);
  const [spentAt, setSpentAt] = useState(todayISO());
  const [suggesting, setSuggesting] = useState(false);

  const [nlSentence, setNlSentence] = useState("");
  const [parsing, setParsing] = useState(false);

  // Inline new-category dialog
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [newCatTarget, setNewCatTarget] = useState<"add" | "row">("add");
  const [newCatRowId, setNewCatRowId] = useState<string | null>(null);

  const createCatMut = useMutation({
    mutationFn: () =>
      upsertCat({
        data: {
          name: newCatName.trim(),
          monthly_budget: Number(newCatBudget || "0"),
        },
      }),
    onSuccess: (cat: { id: string }) => {
      toast.success(`Category "${newCatName.trim()}" created`);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (newCatTarget === "add") {
        setCategoryId(cat.id);
      } else if (newCatRowId) {
        updMut.mutate({ id: newCatRowId, category_id: cat.id });
      }
      setNewCatOpen(false);
      setNewCatName("");
      setNewCatBudget("");
      setNewCatRowId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNewCat(target: "add" | "row", rowId: string | null = null, prefill = "") {
    setNewCatTarget(target);
    setNewCatRowId(rowId);
    setNewCatName(prefill);
    setNewCatBudget("");
    setNewCatOpen(true);
  }

  const addMut = useMutation({
    mutationFn: () => add({
      data: {
        amount: Number(amount),
        description: description.trim(),
        category_id: categoryId === UNCAT ? null : categoryId,
        spent_at: spentAt,
        ai_suggested_category_id: aiSuggested,
      },
    }),
    onSuccess: () => {
      toast.success("Expense added");
      setAmount(""); setDescription(""); setCategoryId(UNCAT); setAiSuggested(null); setSpentAt(todayISO());
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updMut = useMutation({
    mutationFn: (v: { id: string; category_id?: string | null; amount?: number; description?: string; spent_at?: string }) =>
      update({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Inline edit state for a single expense row
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");

  function startEdit(e: { id: string; amount: number | string; description: string | null; spent_at: string }) {
    setEditId(e.id);
    setEditAmount(String(e.amount));
    setEditDesc(e.description ?? "");
    setEditDate(e.spent_at);
  }
  function cancelEdit() { setEditId(null); }
  function saveEdit(id: string) {
    const n = Number(editAmount);
    if (!Number.isFinite(n) || n < 0) return toast.error("Invalid amount");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) return toast.error("Invalid date");
    updMut.mutate({ id, amount: n, description: editDesc.trim(), spent_at: editDate });
    setEditId(null);
  }


  async function handleSuggest() {
    if (!description.trim()) return;
    setSuggesting(true);
    try {
      const r = await suggest({ data: { description: description.trim() } });
      if (r.category_id) {
        setCategoryId(r.category_id);
        setAiSuggested(r.category_id);
        toast.success(`AI suggested: ${r.category_name}`);
      } else {
        toast.info("AI couldn't pick a category. Create some categories first.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleParse() {
    if (!nlSentence.trim()) return;
    setParsing(true);
    try {
      const r = await parseNL({ data: { sentence: nlSentence.trim() } });
      setAmount(String(r.amount));
      setDescription(r.description);
      setCategoryId(r.category_id ?? UNCAT);
      setAiSuggested(r.category_id);
      setSpentAt(r.spent_at);
      setNlSentence("");
      toast.success("Parsed — review and save");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  const cats = catQuery.data ?? [];
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground text-sm">
          Log spending manually or describe it in plain language. AI suggestions are not financial advice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> Add by sentence
          </CardTitle>
          <CardDescription>e.g. "Spent 12 on lunch yesterday" — AI fills the form, you confirm.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); handleParse(); }}
          >
            <Input
              value={nlSentence} onChange={(e) => setNlSentence(e.target.value)}
              placeholder="Spent 8.50 on coffee this morning"
              maxLength={500}
            />
            <Button type="submit" disabled={parsing || !nlSentence.trim()} variant="secondary">
              <Wand2 className="size-4 mr-1" /> {parsing ? "Parsing…" : "Parse"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(amount);
              if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid amount");
              addMut.mutate();
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={description}
                onChange={(e) => { setDescription(e.target.value); setAiSuggested(null); }}
                onBlur={() => { if (description.trim() && categoryId === UNCAT) handleSuggest(); }}
                placeholder="Coffee at campus cafe"
                maxLength={500}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                Category
                <Button
                  type="button" size="sm" variant="ghost" className="h-5 px-1 text-xs"
                  onClick={handleSuggest} disabled={suggesting || !description.trim()}
                >
                  <Sparkles className="size-3" /> {suggesting ? "…" : "AI"}
                </Button>
              </Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  if (v === NEW_CAT) {
                    openNewCat("add", null, description.trim());
                    return;
                  }
                  setCategoryId(v);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNCAT}>Uncategorized</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value={NEW_CAT} className="text-primary font-medium">
                    + Create new category…
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} required />
            </div>
            <div className="lg:col-span-5 flex justify-end">
              <Button type="submit" disabled={addMut.isPending}>
                {addMut.isPending ? "Adding…" : "Add expense"}
              </Button>
            </div>
          </form>
          {aiSuggested && (
            <p className="text-xs text-muted-foreground mt-2">
              AI suggested category — change it if it's wrong (we'll record the correction).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This month's expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expensesQuery.data ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{e.spent_at}</TableCell>
                  <TableCell className="font-medium">{e.description || "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={e.category_id ?? UNCAT}
                      onValueChange={(v) => {
                        if (v === NEW_CAT) {
                          openNewCat("row", e.id, e.description ?? "");
                          return;
                        }
                        updMut.mutate({ id: e.id, category_id: v === UNCAT ? null : v });
                      }}
                    >
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNCAT}>Uncategorized</SelectItem>
                        {cats.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                        <SelectItem value={NEW_CAT} className="text-primary font-medium">
                          + Create new category…
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(e.amount)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Delete this expense?") && delMut.mutate(e.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(expensesQuery.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No expenses yet this month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4" /> New category
            </DialogTitle>
            <DialogDescription>
              Create a category on the fly and assign it to this expense.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!newCatName.trim()) return toast.error("Name required");
              const b = Number(newCatBudget || "0");
              if (!Number.isFinite(b) || b < 0) return toast.error("Budget must be ≥ 0");
              createCatMut.mutate();
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                autoFocus
                value={newCatName}
                onChange={(ev) => setNewCatName(ev.target.value)}
                placeholder="Clothes"
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly budget (optional)</Label>
              <Input
                type="number" min="0" step="0.01"
                value={newCatBudget}
                onChange={(ev) => setNewCatBudget(ev.target.value)}
                placeholder="0"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNewCatOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCatMut.isPending}>
                {createCatMut.isPending ? "Creating…" : "Create & assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
