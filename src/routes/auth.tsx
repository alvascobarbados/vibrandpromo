import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      await routeByRole();
    });
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}