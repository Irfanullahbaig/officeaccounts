import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
