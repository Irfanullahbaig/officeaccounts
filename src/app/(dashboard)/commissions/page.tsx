import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { CoLeadCommissionsTable } from "@/components/commissions/co-lead-table";
import { EmptyState } from "@/components/shared/empty-state";
import { mapLeadCommission } from "@/lib/mappers";

export default async function CommissionsPage() {
  await requireRole(["super_admin", "finance_manager"]);

  const [leads, coLeads] = await Promise.all([
    prisma.leadCommission.findMany({
      include: { leadOwner: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coLeadCommission.findMany({
      include: { coLead: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const leadRows = leads.map(mapLeadCommission);
  const coLeadRows = coLeads.map((c) => ({
    id: c.id,
    client_name: c.clientName,
    deal_value: c.dealValue,
    split_percent: c.splitPercent,
    main_commission: c.mainCommission,
    co_lead_commission: c.coLeadCommission,
    status: c.status,
    payment_date: c.paymentDate?.toISOString() ?? null,
    employees: c.coLead ? { full_name: c.coLead.fullName } : null,
  }));

  return (
    <div>
      <PageHeader title="Commissions" description="Lead and co-lead commission tracking" />
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Lead Commissions</TabsTrigger>
          <TabsTrigger value="co-leads">Co-Lead Commissions</TabsTrigger>
        </TabsList>
        <TabsContent value="leads" className="mt-4">
          {leadRows.length ? <CommissionsTable commissions={leadRows} /> : (
            <EmptyState title="No lead commissions" description="Lead commissions will appear here once recorded." />
          )}
        </TabsContent>
        <TabsContent value="co-leads" className="mt-4">
          {coLeadRows.length ? <CoLeadCommissionsTable commissions={coLeadRows} /> : (
            <EmptyState title="No co-lead commissions" description="Co-lead commission splits will appear here." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
