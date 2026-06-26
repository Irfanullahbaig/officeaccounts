import { prisma } from "@/lib/prisma";
import { queryDatabase } from "@/lib/db/query";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  await requireRole(["super_admin"]);

  const settings = await queryDatabase([], () => prisma.systemSetting.findMany());

  return (
    <div>
      <PageHeader title="System Settings" description="Configure company finance system settings" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Session timeout, default loan settings, and 2FA configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
