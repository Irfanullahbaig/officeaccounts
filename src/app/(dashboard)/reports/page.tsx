"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/utils/export";
import { toast } from "sonner";

const REPORT_TYPES = [
  { id: "revenue", label: "Revenue Report" },
  { id: "employee_earnings", label: "Employee Earnings Report" },
  { id: "commission", label: "Commission Report" },
  { id: "savings", label: "Savings Report" },
  { id: "loans", label: "Loan Report" },
  { id: "expenses", label: "Expense Report" },
  { id: "pnl", label: "Profit & Loss Report" },
  { id: "employee", label: "Employee Financial Statement" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("revenue");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  async function fetchReportData() {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType, month, year });
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to fetch report");
      return null;
    }
    return data.rows as Record<string, unknown>[];
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    const rows = await fetchReportData();
    if (!rows?.length) {
      toast.info("No data for selected filters");
      return;
    }
    const label = REPORT_TYPES.find((r) => r.id === reportType)?.label ?? "Report";
    const filename = `${reportType}-${year}-${month}`;
    if (format === "csv") exportToCSV(rows, filename);
    else if (format === "excel") exportToExcel(rows, filename, label);
    else exportToPDF(rows, filename, label);
    toast.success(`${label} exported`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate and export financial reports" />

      <Card>
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>Filter by month, year, and report type. Export to CSV, Excel, or PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => v && setReportType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={(v) => v && setMonth(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2024, i).toLocaleString("en", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v) => v && setYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleExport("csv")} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport("excel")} disabled={loading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Export Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport("pdf")} disabled={loading}>
              <FileText className="h-4 w-4 mr-2" />Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
