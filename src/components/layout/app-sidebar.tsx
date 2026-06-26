"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  HandCoins,
  TrendingUp,
  Receipt,
  FileBarChart,
  Shield,
  Settings,
  UserCog,
  Calculator,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AuthUser } from "@/types/database";
import { ROLE_LABELS, isFinance, isAdmin } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/client";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "finance_manager"] },
  { title: "My Portal", href: "/my", icon: LayoutDashboard, roles: ["employee"] },
  { title: "Employees", href: "/employees", icon: Users, roles: ["super_admin", "finance_manager"] },
  { title: "Earnings", href: "/revenue", icon: TrendingUp, roles: ["super_admin", "finance_manager"] },
  { title: "Savings", href: "/savings", icon: PiggyBank, roles: ["super_admin", "finance_manager"] },
  { title: "Loans", href: "/loans", icon: HandCoins, roles: ["super_admin", "admin", "finance_manager"] },
  { title: "Loan Calculator", href: "/loans/calculator", icon: Calculator, roles: ["super_admin", "finance_manager"] },
  { title: "Commissions", href: "/commissions", icon: TrendingUp, roles: ["super_admin", "finance_manager"] },
  { title: "Expenses", href: "/expenses", icon: Receipt, roles: ["super_admin", "finance_manager"] },
  { title: "Reports", href: "/reports", icon: FileBarChart, roles: ["super_admin", "finance_manager"] },
];

const adminNav = [
  { title: "Users", href: "/users", icon: UserCog },
  { title: "Audit Logs", href: "/audit-logs", icon: Shield },
  { title: "Settings", href: "/settings", icon: Settings },
];

function AppSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleNav = mainNav.filter((item) => item.roles.includes(user.role));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href={user.role === "employee" ? "/my" : "/dashboard"} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            N9
          </div>
          <div>
            <p className="text-sm font-semibold">N9Accounts</p>
            <p className="text-xs text-muted-foreground">Finance System</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin(user.role) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname.startsWith(item.href)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isFinance(user.role) && !isAdmin(user.role) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/audit-logs" />}
                    isActive={pathname.startsWith("/audit-logs")}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Audit Logs</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName ?? user.email}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
