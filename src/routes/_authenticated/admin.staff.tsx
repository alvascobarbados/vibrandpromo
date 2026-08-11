import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createStaffUser,
  deleteStaffUser,
  listStaffUsers,
  setStaffRole,
  type StaffRole,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Staff | Vibrand Admin" },
      { name: "description", content: "Manage who can access the Vibrand admin." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const { access } = Route.useRouteContext();
  const fetchUsers = useServerFn(listStaffUsers);
  const addUser = useServerFn(createStaffUser);
  const changeRole = useServerFn(setStaffRole);
  const removeUser = useServerFn(deleteStaffUser);

  const users = useQuery({ queryKey: ["admin", "staff-users"], queryFn: () => fetchUsers() });
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    password: "",
    role: "staff" as StaffRole,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "staff-users"] });

  const createMutation = useMutation({
    mutationFn: () => addUser({ data: form }),
    onSuccess: async () => {
      toast.success("Staff member added");
      setForm({ display_name: "", email: "", password: "", role: "staff" });
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { user_id: string; role: StaffRole }) => changeRole({ data: input }),
    onSuccess: async () => {
      toast.success("Role updated");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { user_id: userId } }),
    onSuccess: async () => {
      toast.success("User removed");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admins manage staff; staff get everything except this page.
        </p>
      </div>

      <form
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <h2 className="font-semibold sm:col-span-2">Add a staff member</h2>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            value={form.display_name}
            onChange={(event) => setForm((p) => ({ ...p, display_name: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((p) => ({ ...p, email: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            required
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((p) => ({ ...p, password: event.target.value }))}
          />
        </div>
        <div>
          <Label>Role</Label>
          <Select
            value={form.role}
            onValueChange={(value) => setForm((p) => ({ ...p, role: value as StaffRole }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Add staff member"}
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : null}
            {(users.data ?? []).map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">
                  {user.display_name || "—"}
                  {user.id === access.userId ? (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <Select
                    value={user.role ?? "staff"}
                    onValueChange={(value) =>
                      roleMutation.mutate({ user_id: user.id, role: value as StaffRole })
                    }
                  >
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${user.display_name || user.email}`}
                    disabled={user.id === access.userId || deleteMutation.isPending}
                    onClick={() => {
                      if (!confirm(`Remove ${user.display_name || user.email}?`)) return;
                      deleteMutation.mutate(user.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
