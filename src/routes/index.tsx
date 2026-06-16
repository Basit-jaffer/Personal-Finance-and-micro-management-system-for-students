import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Brain,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Budget Buddy — Smart Student Finance" },
      { name: "description", content: "Track expenses, forecast balances, and get AI-powered budgeting insights — built for students." },
      { property: "og:title", content: "Budget Buddy — Smart Student Finance" },
      { property: "og:description", content: "Track expenses, forecast balances, and get AI-powered budgeting insights — built for students." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/40"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Logo tone="light" />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to="/auth">Log in</Link>
            </Button>
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 font-medium"
              asChild
            >
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Ambient background shapes */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, oklch(0.7 0.16 162 / 0.18) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-60 -left-60 w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, oklch(0.55 0.14 250 / 0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px opacity-30"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--border), transparent)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border/60 text-xs font-medium text-muted-foreground mb-8">
              <Brain className="size-3.5 text-accent" />
              AI-assisted budgeting for students
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-foreground">
              Your money,
              <br />
              <span className="italic text-accent">intelligently</span> managed.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Track expenses, forecast your month-end balance, and get smart
              suggestions — without ever exposing sensitive data.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="h-12 px-7 bg-foreground text-background hover:bg-foreground/90 font-medium text-base gap-2"
                asChild
              >
                <Link to="/auth">
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-7 font-medium text-base gap-2 border-border/60"
                asChild
              >
                <Link to="/auth">Log in</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Free for students.
            </p>
          </div>

          {/* Dashboard preview card */}
          <div className="mt-16 lg:mt-20 relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-accent/20 via-accent/5 to-transparent rounded-[28px] blur-2xl opacity-60" />
            <div className="relative rounded-2xl border border-border/60 bg-card shadow-lift overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-destructive/70" />
                  <div className="size-2.5 rounded-full bg-warning/70" />
                  <div className="size-2.5 rounded-full bg-success/70" />
                </div>
                <div className="text-[10px] text-muted-foreground font-medium ml-2">
                  Budget Buddy — Dashboard
                </div>
              </div>
              <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard label="Total Income" value="$2,450.00" trend="+12%" positive />
                <KpiCard label="Spent this month" value="$1,180.50" trend="-5%" positive />
                <KpiCard label="Available" value="$769.50" trend="On track" neutral />
              </div>
              <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="h-32 rounded-xl bg-muted/40 border border-border/30 flex items-end gap-2 px-4 pb-3">
                  {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 48, 90].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-accent/60 hover:bg-accent transition-colors"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — concise */}
      <section className="py-20 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
              Everything you need
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              A complete toolkit for managing your finances as a student.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TrendingUp className="size-5" />}
              title="Smart Forecasting"
              description="Predict your month-end balance with AI-powered insights based on your spending patterns."
            />
            <FeatureCard
              icon={<PiggyBank className="size-5" />}
              title="Savings Goals"
              description="Set targets, track contributions, and watch your savings grow with visual progress."
            />
            <FeatureCard
              icon={<BarChart3 className="size-5" />}
              title="Clear Reports"
              description="Generate monthly breakdowns by category. Understand exactly where your money goes."
            />
          </div>
        </div>
      </section>

      {/* Social proof / CTA band */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative rounded-2xl bg-grad-hero text-white p-10 sm:p-14 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
                  Ready to take control?
                </h2>
                <p className="mt-2 text-white/60 max-w-md">
                  Join students who use Budget Buddy to stay on top of their finances.
                </p>
              </div>
              <Button
                size="lg"
                className="h-12 px-7 bg-white text-foreground hover:bg-white/95 font-medium text-base gap-2 shrink-0"
                asChild
              >
                <Link to="/auth">
                  Get started free
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <LogoMark className="size-4" />
            <span className="font-medium text-foreground">Budget Buddy</span>
            <span className="opacity-50">— Smart finance for students.</span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI suggestions only — not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  positive,
  neutral,
}: {
  label: string;
  value: string;
  trend: string;
  positive?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      <div
        className={`mt-1 text-xs font-medium ${
          neutral
            ? "text-muted-foreground"
            : positive
            ? "text-success"
            : "text-destructive"
        }`}
      >
        {trend}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/40 bg-card p-6 hover:shadow-card transition-all duration-300 hover:-translate-y-0.5">
      <div className="size-10 rounded-xl bg-accent/10 text-accent grid place-items-center mb-4 group-hover:shadow-glow transition-shadow duration-300">
        {icon}
      </div>
      <h3 className="font-semibold text-[15px]">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16 2.5 4 7.5v9c0 6.5 5.1 11.4 12 13 6.9-1.6 12-6.5 12-13v-9L16 2.5Z"
        className="fill-current opacity-20"
      />
      <rect x="9" y="17" width="3" height="6" rx="1" className="fill-current" />
      <rect x="14.5" y="13" width="3" height="10" rx="1" className="fill-current" />
      <rect x="20" y="9" width="3" height="14" rx="1" className="fill-current" />
      <circle cx="21.5" cy="6" r="1.6" className="fill-current" />
    </svg>
  );
}
