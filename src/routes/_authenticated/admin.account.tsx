import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess, updateMyProfile } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/account")({
  head: () => ({
    meta: [
      { title: "My Account | Vibrand Admin" },
      { name: "description", content: "Update your display name and password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const saveProfile = useServerFn(updateMyProfile);

  const access = useQuery({ queryKey: ["admin", "my-access"], queryFn: () => fetchAccess() });
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (access.data) setDisplayName(access.data.displayName);
  }, [access.data]);

  const profileMutation = useMutation({
    mutationFn: (name: string) => saveProfile({ data: { display_name: name } }),
    onSuccess: async () => {
      toast.success("Display name updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "my-access"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("The two passwords don't match.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {access.data?.email} · {access.data?.isAdmin ? "Admin" : "Staff"}
        </p>
      </div>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          profileMutation.mutate(displayName.trim());
        }}
      >
        <h2 className="font-semibold">Display name</h2>
        <div>
          <Label htmlFor="display_name">Name shown in the staff list</Label>
          <Input
            id="display_name"
            required
            maxLength={120}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={profileMutation.isPending}>
          {profileMutation.isPending ? "Saving…" : "Save name"}
        </Button>
      </form>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
        onSubmit={changePassword}
      >
        <h2 className="font-semibold">Change password</h2>
        <div>
          <Label htmlFor="new_password">New password</Label>
          <Input
            id="new_password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={savingPassword}>
          {savingPassword ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
