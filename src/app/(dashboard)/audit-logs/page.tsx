import { prisma } from "@/lib/prisma";
import { queryDatabase } from "@/lib/db/query";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/empty-state";

export default async function AuditLogsPage() {
  await requireRole(["super_admin", "finance_manager"]);

  const logs = await queryDatabase([], () =>
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  );

  return (
    <div>
      <PageHeader title="Audit Logs" description="Complete trail of all financial transactions and system changes" />
      {logs.length ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{formatDate(log.createdAt.toISOString())}</TableCell>
                  <TableCell>{log.userEmail ?? "System"}</TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {log.newValue?.slice(0, 80) ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState title="No audit logs yet" description="All financial transactions will be logged here automatically." />
      )}
    </div>
  );
}
