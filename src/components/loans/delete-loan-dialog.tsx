"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteLoan } from "@/lib/actions/loans";
import { toast } from "sonner";

export function DeleteLoanDialog({
  loanId,
  hasPayments,
  redirectTo,
}: {
  loanId: string;
  hasPayments: boolean;
  redirectTo?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteLoan(loanId);
      toast.success("Loan deleted");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete loan");
    }
    setLoading(false);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasPayments
              ? "This permanently removes the loan, all payment history, and ledger entries. This cannot be undone."
              : "This permanently removes the loan and its ledger. This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Loan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
