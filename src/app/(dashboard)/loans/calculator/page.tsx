"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { generateAmortizationSchedule } from "@/lib/loans/calculator";
import { formatCurrency } from "@/lib/utils/format";
import type { InterestType } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { Calculator } from "lucide-react";

const schema = z.object({
  principal: z.number().min(1),
  annualRate: z.number().min(0),
  interestType: z.enum(["daily_diminishing", "monthly_diminishing", "flat"]),
  repaymentAmount: z.number().min(1),
  durationMonths: z.number().min(1).optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoanCalculatorPage() {
  const [result, setResult] = useState<ReturnType<typeof generateAmortizationSchedule> | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      principal: 100000,
      annualRate: 15,
      interestType: "daily_diminishing",
      repaymentAmount: 10000,
      durationMonths: 12,
    },
  });

  function onCalculate(data: FormData) {
    const calc = generateAmortizationSchedule({
      principal: data.principal,
      annualRatePercent: data.annualRate,
      interestType: data.interestType as InterestType,
      repaymentAmount: data.repaymentAmount,
      maxPeriods: data.interestType === "daily_diminishing" ? 365 : (data.durationMonths ?? 12) * 30,
    });
    setResult(calc);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Calculator"
        description="Interactive diminishing balance loan calculator with amortization schedule"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Loan Parameters
            </CardTitle>
            <CardDescription>
              Daily diminishing balance: interest calculated on remaining principal only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-4">
              <div className="space-y-2">
                <Label>Principal Amount</Label>
                <Input type="number" {...form.register("principal", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Annual Interest Rate (%)</Label>
                <Input type="number" step="0.01" {...form.register("annualRate", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Interest Type</Label>
                <Select
                  value={form.watch("interestType")}
                  onValueChange={(v) => v && form.setValue("interestType", v as FormData["interestType"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_diminishing">Daily Diminishing (Default)</SelectItem>
                    <SelectItem value="monthly_diminishing">Monthly Diminishing</SelectItem>
                    <SelectItem value="flat">Flat Interest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repayment Amount (per period)</Label>
                <Input type="number" {...form.register("repaymentAmount", { valueAsNumber: true })} />
              </div>
              <Button type="submit" className="w-full">Calculate</Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Calculation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground">Daily Rate</p>
                  <p className="font-semibold">{(result.dailyRate * 100).toFixed(4)}%</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground">Daily Interest (Day 1)</p>
                  <p className="font-semibold">{formatCurrency(result.dailyInterest)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground">Monthly Interest</p>
                  <p className="font-semibold">{formatCurrency(result.monthlyInterest)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground">Total Interest</p>
                  <p className="font-semibold">{formatCurrency(result.totalInterest)}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 col-span-2">
                  <p className="text-muted-foreground">Total Payable</p>
                  <p className="text-xl font-bold">{formatCurrency(result.totalPayable)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {result && result.schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Amortization Schedule</CardTitle>
            <CardDescription>
              Each payment reduces principal — future interest calculated on remaining balance only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Daily Int.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.schedule.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{formatCurrency(row.payment)}</TableCell>
                      <TableCell>{formatCurrency(row.principal)}</TableCell>
                      <TableCell>{formatCurrency(row.interest)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(row.balance)}</TableCell>
                      <TableCell>{formatCurrency(row.dailyInterest)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
