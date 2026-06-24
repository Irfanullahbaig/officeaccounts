"use client";

import { useState } from "react";
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
import { createEmployee } from "@/lib/actions/finance";
import { toast } from "sonner";

const schema = z.object({
  employee_code: z.string().min(1, "Required"),
  full_name: z.string().min(2, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joining_date: z.string().min(1, "Required"),
  base_salary: z.number().min(0),
  role: z.enum(["super_admin", "finance_manager", "employee"]),
});

type FormData = z.infer<typeof schema>;

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "employee",
      base_salary: 0,
      joining_date: new Date().toISOString().split("T")[0],
    },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await createEmployee(data);
      toast.success("Employee added successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add employee");
    }
    setLoading(false);
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
              <Input {...form.register("employee_code")} placeholder="EMP-001" />
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
            <div className="space-y-2 col-span-2">
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
