import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import type { UserRole } from "@/types/database";

async function findSupabaseUserByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.toLowerCase().trim();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

export async function upsertSupabaseAuthUser(params: {
  email: string;
  password: string;
  role: UserRole;
}) {
  if (!isSupabaseAuthConfigured()) return;

  const admin = createAdminClient();
  const email = params.email.toLowerCase().trim();
  const existing = await findSupabaseUserByEmail(email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: params.password,
      email_confirm: true,
      user_metadata: { role: params.role },
      app_metadata: { role: params.role },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
    user_metadata: { role: params.role },
    app_metadata: { role: params.role },
  });
  if (error) throw error;
  return data.user.id;
}

export async function deleteSupabaseAuthUser(email: string) {
  if (!isSupabaseAuthConfigured()) return;

  const admin = createAdminClient();
  const existing = await findSupabaseUserByEmail(email);
  if (!existing) return;

  const { error } = await admin.auth.admin.deleteUser(existing.id);
  if (error) throw error;
}

export async function updateSupabaseAuthMetadata(email: string, role: UserRole) {
  if (!isSupabaseAuthConfigured()) return;

  const admin = createAdminClient();
  const existing = await findSupabaseUserByEmail(email);
  if (!existing) return;

  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    user_metadata: { role },
    app_metadata: { role },
  });
  if (error) throw error;
}
