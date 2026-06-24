"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { addAllowedUser, removeAllowedUser, updateUserRole } from "@/lib/actions/finance";
import { toast } from "sonner";
import type { AllowedUser, UserRole } from "@/types/database";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cnStatusColor } from "@/lib/utils/format";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["super_admin", "admin", "finance_manager", "employee", "viewer"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export function UsersManagement({ users }: { users: AllowedUser[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "employee" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await addAllowedUser(data);
      toast.success("User added to allowed list");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add user");
    }
    setLoading(false);
  }

  async function handleRemove(id: string) {
    try {
      await removeAllowedUser(id);
      toast.success("User removed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove user");
    }
  }

  async function handleRoleChange(id: string, role: UserRole) {
    try {
      await updateUserRole(id, role);
      toast.success("Role updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    }
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add User</Button>} />
        <DialogContent>
          <DialogHeader><DialogTitle>Add Authorized User</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Email</Label>
              <Input type="email" {...form.register("email")} placeholder="user@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Initial Password</Label>
              <Input type="password" {...form.register("password")} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.watch("role")} onValueChange={(v) => v && form.setValue("role", v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="finance_manager">Finance Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>Add User</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Select value={user.role} onValueChange={(v) => v && handleRoleChange(user.id, v as UserRole)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["employee", "viewer", "finance_manager", "admin", "super_admin"] as UserRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cnStatusColor(user.status)}>{user.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(user.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
