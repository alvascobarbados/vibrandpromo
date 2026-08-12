import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getMyAccess } from "@/lib/staff.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | Vibrand Admin" },
      {
        name: "description",
        content: "Secure sign in for Vibrand staff to manage products, categories and quote requests.",
      },
      { property: "og:title", content: "Staff Sign In | Vibrand Admin" },
      { property: "og:description", content: "Vibrand staff administration sign in." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      await routeByRole();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void routeByRole();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeByRole() {
    try {
      const access = await getMyAccess();
      if (access.isStaff) {
        navigate({ to: "/admin", replace: true });
        return;
      }
    } catch (error) {
      console.error(error);
    }
    toast.error("This account doesn't have admin access.");
    navigate({ to: "/", replace: true });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error(result.error.message || "Google sign-in failed.");
      return;
    }
    if (result.redirected) return;
    await routeByRole();
    setGoogleLoading(false);
  }

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setLinkLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    setLinkLoading(false);
    if (error) {
      const message = /signups? not allowed|not found|otp_disabled/i.test(error.message)
        ? "No account found for this email. Ask an admin to add you."
        : error.message;
      toast.error(message);
      return;
    }
    setLinkSentTo(address);
    setCooldown(45);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    await routeByRole();
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lift">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to site
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Staff sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin access is limited to Vibrand team accounts.
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? "Opening Google…" : "Continue with Google"}
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {linkSentTo ? (
          <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm">
            <p className="font-semibold">Link sent — check your inbox</p>
            <p className="mt-1 text-muted-foreground">
              We emailed a one-tap sign-in link to {linkSentTo}. It expires shortly, so use it soon.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cooldown > 0 || linkLoading}
                onClick={(event) => void handleMagicLink(event)}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground underline"
                onClick={() => setLinkSentTo(null)}
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              variant="outline"
              className="w-full"
              disabled={linkLoading}
            >
              {linkLoading ? "Sending link…" : "Email me a sign-in link"}
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide password sign-in" : "Use password instead"}
          </button>
          {showPassword ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="pw-email">Email</Label>
                <Input
                  id="pw-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in with password"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}