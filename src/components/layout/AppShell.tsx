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
import {
  LayoutDashboard, Receipt, PiggyBank, Target, FileBarChart,
  LogOut, Trash2, Menu, X, ChevronRight, Sparkles, ArrowLeft,
} from "lucide-react";
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

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/expenses": "Expenses",
  "/budgets": "Budgets",
  "/savings": "Savings goals",
  "/reports": "Reports",
};

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

  const initials = (email?.[0] ?? "U").toUpperCase();
  const currentTitle = TITLES[pathname] ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col transition-transform duration-200 ${
          open ? "translate-x-0 flex" : "-translate-x-full hidden lg:flex"
        }`}
      >
        <Link
          to="/dashboard"
          className="px-5 h-[68px] flex items-center border-b border-sidebar-border/70 hover:bg-white/[0.03] transition"
        >
          <Logo />
        </Link>

        <div className="px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">
          Menu
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-white/[0.05] hover:text-sidebar-foreground transition-all data-[status=active]:bg-white/[0.08] data-[status=active]:text-sidebar-foreground"
              activeProps={{ "data-status": "active" } as any}
            >
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent opacity-0 transition group-data-[status=active]:opacity-100" />
              <item.icon className="size-[18px] opacity-70 group-data-[status=active]:opacity-100 group-data-[status=active]:text-accent transition" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="m-3 p-4 rounded-2xl bg-grad-hero border border-white/[0.06] relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground mb-1.5">
            <Sparkles className="size-3.5 text-accent" /> AI insights
          </div>
          <div className="text-[11px] leading-relaxed text-sidebar-foreground/60">
            Personalized suggestions to help you save smarter.
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[68px] border-b bg-card/80 backdrop-blur-md flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-20">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/dashboard" className="lg:hidden flex items-center">
            <Logo collapsed tone="light" />
          </Link>

          {/* Breadcrumb */}
          {currentTitle && (
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition">
                Budget Buddy
              </Link>
              <ChevronRight className="size-3.5 text-muted-foreground/60" />
              <span className="font-medium">{currentTitle}</span>
            </div>
          )}

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2 hover:bg-muted">
                <div className="size-8 rounded-full bg-grad-accent text-accent-foreground text-xs font-semibold grid place-items-center ring-1 ring-border shadow-sm">
                  {initials}
                </div>
                <span className="hidden sm:inline text-sm truncate max-w-[160px] text-muted-foreground">
                  {email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="truncate font-normal text-xs text-muted-foreground">
                Signed in as
                <div className="text-sm font-medium text-foreground truncate">{email}</div>
              </DropdownMenuLabel>
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
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
