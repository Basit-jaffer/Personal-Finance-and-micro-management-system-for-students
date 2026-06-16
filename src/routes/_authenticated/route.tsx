import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { LayoutDashboard, Receipt, PiggyBank, Target, FileBarChart, Wallet, LogOut, Trash2, Menu, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteAllMyData } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id, email: data.user.email ?? "" };
  },
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/savings", label: "Savings", icon: Target },
  { to: "/reports", label: "Reports", icon: FileBarChart },
] as const;

function AppShell() {
  const { email } = Route.useRouteContext();
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
        <Link to="/dashboard" className="px-6 h-16 flex items-center gap-2 border-b border-sidebar-border hover:bg-white/5 transition">
          <div className="size-8 rounded-lg bg-accent text-accent-foreground grid place-items-center">
            <Wallet className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Budget Buddy</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground transition data-[status=active]:bg-white/10 data-[status=active]:text-sidebar-foreground"
              activeProps={{ "data-status": "active" } as any}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
          AI suggestions only — not financial advice.
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
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-accent text-accent-foreground grid place-items-center">
              <Wallet className="size-4" />
            </div>
            <span className="font-semibold tracking-tight hidden sm:inline">Budget Buddy</span>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
