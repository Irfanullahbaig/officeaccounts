"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { deleteEmployee, updateEmployee } from "@/lib/actions/finance";
import { toast } from "sonner";
import type { Employee, UserRole } from "@/types/database";
import { ROLE_LABELS } from "@/lib/auth/permissions";

const schema = z.object({
  employee_code: z.string().min(1),
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joining_date: z.string().min(1),
  status: z.enum(["active", "inactive", "terminated", "on_leave"]),
  role: z.enum(["super_admin", "admin", "finance_manager", "employee", "viewer"]),
});

type FormData = z.infer<typeof schema>;

export function EditEmployeeDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone ?? "",
      department: employee.department ?? "",
      designation: employee.designation ?? "",
      joining_date: employee.joining_date.split("T")[0],
      status: employee.status as FormData["status"],
      role: employee.role,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone ?? "",
      department: employee.department ?? "",
      designation: employee.designation ?? "",
      joining_date: employee.joining_date.split("T")[0],
      status: employee.status as FormData["status"],
      role: employee.role,
    });
  }, [open, employee, form]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await updateEmployee(employee.id, data);
      toast.success("Employee updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update employee");
    }
    setLoading(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteEmployee(employee.id);
      toast.success(
        result.deactivated
          ? "Employee deactivated (has financial records)"
          : "Employee deleted"
      );
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete employee");
    }
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input {...form.register("employee_code")} />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register("full_name")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input {...form.register("department")} />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input {...form.register("designation")} />
            </div>
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input type="date" {...form.register("joining_date")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => v && form.setValue("status", v as FormData["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Role</Label>
              <Select value={form.watch("role")} onValueChange={(v) => v && form.setValue("role", v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={deleting}><Trash2 className="h-4 w-4" /></Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete employee?</AlertDialogTitle>
                  <AlertDialogDescription>
                    If this employee has income or loan records, they will be deactivated instead of permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
