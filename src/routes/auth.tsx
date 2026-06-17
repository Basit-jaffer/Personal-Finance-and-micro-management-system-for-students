import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Sparkles, ShieldCheck, TrendingUp, MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupSentEmail, setSignupSentEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<"signin" | "signup">("signin");


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Please enter your full name");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        toast.error("Account already exists", {
          description: "An account with this email already exists. Please sign in instead.",
        });
        setTab("signin");
        setPassword("");
        setConfirmPassword("");
        return;
      }
      return toast.error(error.message);
    }
    // Supabase returns a user with empty identities[] when the email is already registered
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      toast.error("Account already exists", {
        description: "An account with this email already exists. Please sign in instead.",
      });
      setTab("signin");
      setPassword("");
      setConfirmPassword("");
      return;
    }
    if (data.session) {
      toast.success("Account created. Welcome!");
      navigate({ to: "/dashboard", replace: true });
    } else {
      setSignupSentEmail(email);
      toast.success("Verification email sent", {
        description: `We sent a confirmation link to ${email}.`,
      });
    }
  }


  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-grad-hero text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/80">
            <Sparkles className="size-3 text-accent" /> AI-assisted budgeting
          </div>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
            Private, intelligent finance built for students.
          </h1>
          <p className="text-white/60 leading-relaxed">
            Track expenses, forecast your month-end balance, and get smart suggestions —
            without ever exposing sensitive data.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Feature icon={<TrendingUp className="size-4" />} label="Real-time forecasts" />
            <Feature icon={<ShieldCheck className="size-4" />} label="Privacy by default" />
          </div>
        </div>
        <p className="relative text-xs text-white/40">
          AI suggestions only — not financial advice.
        </p>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo tone="light" /></div>
          <Card className="border-border/60 shadow-lift">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-semibold tracking-tight">Welcome to Budget Buddy</CardTitle>
              <CardDescription>Sign in or create a free account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="email-in">Email</Label>
                      <Input id="email-in" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pw-in">Password</Label>
                      <Input id="pw-in" type="password" placeholder="••••••••" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  {signupSentEmail ? (
                    <div className="mt-6 space-y-5 text-center">
                      <div className="mx-auto size-14 rounded-full bg-accent/10 text-accent grid place-items-center">
                        <MailCheck className="size-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold tracking-tight">Check your inbox</h3>
                        <p className="text-sm text-muted-foreground">
                          We sent a verification link to{" "}
                          <span className="font-medium text-foreground">{signupSentEmail}</span>.
                          Click the link to activate your account, then sign in.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 pt-2">
                        <Button
                          type="button"
                          className="w-full h-11 font-medium"
                          onClick={() => {
                            setTab("signin");
                            setPassword("");
                            setConfirmPassword("");
                            setFullName("");
                            setSignupSentEmail(null);
                          }}
                        >
                          Go to sign in
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-10 text-xs text-muted-foreground"
                          onClick={() => setSignupSentEmail(null)}
                        >
                          Use a different email
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-2">
                        Didn't get it? Check your spam folder, or wait a minute and try again.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={signUp} className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="name-up">Full name</Label>
                        <Input id="name-up" type="text" placeholder="Jane Doe" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-up">Email</Label>
                        <Input id="email-up" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pw-up">Password</Label>
                        <Input id="pw-up" type="password" placeholder="At least 6 characters" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pw-up2">Confirm password</Label>
                        <Input id="pw-up2" type="password" placeholder="Re-enter your password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We'll send a verification link to your email after signup.
                      </p>
                      <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
                        {loading ? "Creating…" : "Create account"}
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 text-sm text-white/80">
      <span className="text-accent">{icon}</span>
      {label}
    </div>
  );
}
