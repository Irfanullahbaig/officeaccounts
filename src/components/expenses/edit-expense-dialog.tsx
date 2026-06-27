"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateExpense } from "@/lib/actions/finance";
import { toast } from "sonner";
import type { Expense, ExpenseCategory } from "@/types/database";

const CATEGORIES: ExpenseCategory[] = [
  "salaries",
  "office_rent",
  "marketing",
  "utilities",
  "equipment",
  "software",
  "miscellaneous",
];

const schema = z.object({
  category: z.enum([
    "salaries",
    "office_rent",
    "marketing",
    "utilities",
    "equipment",
    "software",
    "miscellaneous",
  ]),
  amount: z.number().min(0.01),
  expense_date: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function formatCategoryLabel(category: string) {
  return category.replace(/_/g, " ");
}

export function EditExpenseDialog({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: expense.category,
      amount: Number(expense.amount),
      expense_date: expense.expense_date.split("T")[0],
      notes: expense.notes ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      category: expense.category,
      amount: Number(expense.amount),
      expense_date: expense.expense_date.split("T")[0],
      notes: expense.notes ?? "",
    });
  }, [open, expense, form]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await updateExpense(expense.id, data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Expense updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update expense");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch("category")}
              onValueChange={(v) => v && form.setValue("category", v as FormData["category"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatCategoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" {...form.register("amount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register("expense_date")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
