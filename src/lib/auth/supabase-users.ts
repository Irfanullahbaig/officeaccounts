import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export type SupabaseUserMetadata = {
  role: UserRole;
  employeeId?: string | null;
  fullName?: string | null;
  allowedUserId?: string;
};

export async function upsertSupabaseAuthUser(
  email: string,
  password: string,
  metadata: SupabaseUserMetadata
) {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(listError.message);

  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: metadata,
    });
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    app_metadata: metadata,
  });
  if (error) throw new Error(error.message);
  return data.user.id;
}

export async function updateSupabaseAuthMetadata(
  email: string,
  metadata: SupabaseUserMetadata
) {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(listError.message);

  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  );
  if (!existing) return;

  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    app_metadata: metadata,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSupabaseAuthUser(email: string) {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(listError.message);

  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  );
  if (!existing) return;

  const { error } = await admin.auth.admin.deleteUser(existing.id);
  if (error) throw new Error(error.message);
}
