"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createEmployee, getNextEmployeeCode } from "@/lib/actions/finance";
import { EMPLOYEE_STATUS_OPTIONS } from "@/lib/employees/status";
import { toast } from "sonner";

const schema = z.object({
  full_name: z.string().min(2, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joining_date: z.string().min(1, "Required"),
  base_salary: z.number().min(0),
  role: z.enum(["super_admin", "finance_manager", "employee"]),
  status: z.enum(["active", "inactive", "terminated", "on_leave"]),
});

type FormData = z.infer<typeof schema>;

const defaultFormValues: FormData = {
  role: "employee",
  status: "active",
  base_salary: 0,
  joining_date: new Date().toISOString().split("T")[0],
  full_name: "",
  email: "",
};

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextCode, setNextCode] = useState("N9-1001");
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!open) return;
    getNextEmployeeCode()
      .then(setNextCode)
      .catch(() => toast.error("Failed to load next employee ID"));
  }, [open]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await createEmployee(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Employee ${result.employeeCode ?? nextCode} added successfully`);
      setOpen(false);
      form.reset({
        ...defaultFormValues,
        joining_date: new Date().toISOString().split("T")[0],
      });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button>} />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={nextCode} readOnly className="font-mono bg-muted" />
              <p className="text-xs text-muted-foreground">Auto-assigned (N9-1001, N9-1002…)</p>
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
              <Label>Base Salary</Label>
              <Input type="number" {...form.register("base_salary", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => v && form.setValue("status", v as FormData["status"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) => v && form.setValue("role", v as FormData["role"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="finance_manager">Finance Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Employee"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
