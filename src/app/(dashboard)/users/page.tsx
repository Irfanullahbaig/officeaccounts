import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { UsersManagement } from "@/components/users/users-management";
import { mapAllowedUser } from "@/lib/mappers";

export default async function UsersPage() {
  await requireRole(["super_admin"]);

  const rows = await prisma.allowedUser.findMany({ orderBy: { createdAt: "desc" } });
  const users = rows.map(mapAllowedUser);

  return (
    <div>
      <PageHeader title="User Management" description="Add, remove, and assign roles to authorized users" />
      <UsersManagement users={users} />
    </div>
  );
}
