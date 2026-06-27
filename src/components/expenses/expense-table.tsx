"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpense } from "@/lib/actions/finance";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Expense, ExpenseCategory } from "@/types/database";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";

function formatCategoryLabel(category: string) {
  return category.replace(/_/g, " ");
}

const CATEGORIES: ExpenseCategory[] = [
  "salaries", "office_rent", "marketing", "utilities", "equipment", "software", "miscellaneous",
];

const schema = z.object({
  category: z.enum(["salaries", "office_rent", "marketing", "utilities", "equipment", "software", "miscellaneous"]),
  amount: z.number().min(0.01),
  expense_date: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { expense_date: new Date().toISOString().split("T")[0], category: "miscellaneous" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await createExpense(data);
      toast.success("Expense added");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add expense");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.watch("category")} onValueChange={(v) => v && form.setValue("category", v as FormData["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Amount</Label><Input type="number" {...form.register("amount", { valueAsNumber: true })} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" {...form.register("expense_date")} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
          <Button type="submit" className="w-full" disabled={loading}>Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="capitalize font-medium">{formatCategoryLabel(e.category)}</TableCell>
              <TableCell>{formatCurrency(Number(e.amount))}</TableCell>
              <TableCell>{formatDate(e.expense_date)}</TableCell>
              <TableCell className="text-muted-foreground">{e.notes ?? "—"}</TableCell>
              <TableCell>
                <EditExpenseDialog expense={e} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
