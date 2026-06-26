import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isDirector } from "@/lib/auth/permissions";
import { DirectorShell } from "@/components/director/director-sidebar";

export const dynamic = "force-dynamic";

export default async function DirectorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !isDirector(user.role)) {
    redirect("/director/login");
  }

  return <DirectorShell user={user}>{children}</DirectorShell>;
}
