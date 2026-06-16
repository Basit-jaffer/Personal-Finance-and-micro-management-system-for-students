import { Link, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, Receipt, PiggyBank, Target, FileBarChart, LogOut, Trash2, Menu, X, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteAllMyData } from "@/lib/finance.functions";

export async function requireAuth() {
  if (typeof window === "undefined") return { userId: "", email: "" };
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth" });
  return { userId: data.user.id, email: data.user.email ?? "" };
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/savings", label: "Savings", icon: Target },
  { to: "/reports", label: "Reports", icon: FileBarChart },
] as const;

export function AppShell({ email, children }: { email: string; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const deleteAll = useServerFn(deleteAllMyData);

  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function handleDeleteAll() {
    if (!confirm("Delete ALL your data? This cannot be undone.")) return;
    try {
      await deleteAll();
      queryClient.invalidateQueries();
      toast.success("All your data has been deleted.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col transition-transform ${
          open ? "translate-x-0 flex" : "-translate-x-full hidden lg:flex"
        }`}
      >
        <Link
          to="/dashboard"
          className="px-5 h-20 flex items-center border-b border-sidebar-border hover:bg-white/[0.03] transition"
        >
          <Logo />
        </Link>
        <div className="px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/40">
          Menu
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-white/[0.04] hover:text-sidebar-foreground transition data-[status=active]:bg-white/[0.08] data-[status=active]:text-sidebar-foreground data-[status=active]:shadow-[inset_2px_0_0_0_hsl(var(--accent))]"
              activeProps={{ "data-status": "active" } as any}
            >
              <item.icon className="size-[18px] opacity-80 group-data-[status=active]:opacity-100" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="m-3 p-4 rounded-xl bg-white/[0.03] border border-sidebar-border/60">
          <div className="text-xs font-medium text-sidebar-foreground/80 mb-1">
            AI-powered insights
          </div>
          <div className="text-[11px] leading-relaxed text-sidebar-foreground/50">
            Suggestions only — not financial advice.
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b bg-card flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-20">
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/dashboard" className="lg:hidden flex items-center">
            <Logo collapsed />
          </Link>
          {pathname !== "/dashboard" && (
            <Button asChild variant="ghost" size="sm" className="gap-1 ml-2">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" /> Dashboard
              </Link>
            </Button>
          )}
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <div className="size-6 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center">
                  {email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden sm:inline truncate max-w-[160px]">{email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDeleteAll} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4 mr-2" /> Delete all my data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
