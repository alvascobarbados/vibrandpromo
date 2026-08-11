import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffRole = "admin" | "staff";

export type StaffUser = {
  id: string;
  email: string;
  display_name: string;
  role: StaffRole | null;
  created_at: string;
};

export type MyAccess = {
  userId: string;
  email: string;
  displayName: string;
  isStaff: boolean;
  isAdmin: boolean;
};

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccess> => {
    const { supabase, userId } = context;

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("display_name, email").eq("id", userId).maybeSingle(),
    ]);

    const roleList = (roles ?? []).map((row) => row.role);

    return {
      userId,
      email: profile?.email ?? "",
      displayName: profile?.display_name ?? "",
      isStaff: roleList.length > 0,
      isAdmin: roleList.includes("admin"),
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ display_name: z.string().trim().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.display_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

async function assertAdmin(supabase: { rpc: (fn: string, args: Record<string, unknown>) => unknown }, userId: string) {
  const { data, error } = (await (supabase as any).rpc("is_admin", { _user_id: userId })) as {
    data: boolean | null;
    error: { message: string } | null;
  };
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export const listStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffUser[]> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);

    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, display_name, email"),
    ]);

    const roleByUser = new Map((roles ?? []).map((row) => [row.user_id, row.role as StaffRole]));
    const profileByUser = new Map((profiles ?? []).map((row) => [row.id, row]));

    return list.users
      .map((user) => ({
        id: user.id,
        email: user.email ?? "",
        display_name:
          profileByUser.get(user.id)?.display_name ||
          (user.user_metadata?.["display_name"] as string | undefined) ||
          "",
        role: roleByUser.get(user.id) ?? null,
        created_at: user.created_at,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  });

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        role: z.enum(["admin", "staff"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Unable to create the account");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, display_name: data.display_name, email: data.email });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleError) throw new Error(roleError.message);

    return { ok: true as const, id: created.user.id };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(["admin", "staff"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role !== "admin") {
      const { data: admins, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw new Error(error.message);
      const adminIds = (admins ?? []).map((row) => row.user_id);
      if (adminIds.includes(data.user_id) && adminIds.length <= 1) {
        throw new Error("You cannot demote the last remaining admin.");
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (insertError) throw new Error(insertError.message);

    return { ok: true as const };
  });

export const deleteStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    if (data.user_id === context.userId) {
      throw new Error("You cannot remove your own account.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: admins, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    const adminIds = (admins ?? []).map((row) => row.user_id);
    if (adminIds.includes(data.user_id) && adminIds.length <= 1) {
      throw new Error("You cannot remove the last remaining admin.");
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (deleteError) throw new Error(deleteError.message);

    return { ok: true as const };
  });
