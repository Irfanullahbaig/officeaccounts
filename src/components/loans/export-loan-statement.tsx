"use client";

import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/utils/export";
import { toast } from "sonner";

export function ExportLoanStatement({
  rows,
  filename,
  employeeName,
}: {
  rows: Record<string, unknown>[];
  filename: string;
  employeeName: string;
}) {
  if (!rows.length) return null;

  const title = `Loan Statement — ${employeeName}`;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => { exportToCSV(rows, filename); toast.success("CSV exported"); }}
      >
        <Download className="h-4 w-4 mr-1" /> CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { exportToExcel(rows, filename, "Loan Statement"); toast.success("Excel exported"); }}
      >
        <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { exportToPDF(rows, filename, title); toast.success("PDF exported"); }}
      >
        <FileText className="h-4 w-4 mr-1" /> PDF
      </Button>
    </div>
  );
}
