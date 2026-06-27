import { formatCurrency, formatDate, getMonthName } from "@/lib/utils/format";
import { getEmployeeStatusLabel } from "@/lib/employees/status";

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #111;
    margin: 40px;
    line-height: 1.6;
  }
  .header { text-align: center; margin-bottom: 32px; }
  .company { font-size: 22px; font-weight: bold; letter-spacing: 0.5px; }
  .meta { font-size: 12px; color: #444; margin-top: 4px; }
  h1 { font-size: 18px; margin: 24px 0 16px; text-align: center; text-decoration: underline; }
  p { margin: 12px 0; font-size: 14px; }
  .salary-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
  }
  .salary-table th, .salary-table td {
    border: 1px solid #333;
    padding: 8px 12px;
    text-align: left;
  }
  .salary-table th { background: #f5f5f5; }
  .total-row td { font-weight: bold; }
  .signatures {
    margin-top: 48px;
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .sign-line {
    margin-top: 48px;
    border-top: 1px solid #333;
    width: 200px;
    padding-top: 6px;
  }
  @media print {
    body { margin: 24px; }
  }
`;

export function printDocument(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}

function tenureText(joiningDate: string, status: string): string {
  const start = new Date(joiningDate);
  const end = new Date();
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  let duration = "";
  if (years > 0) duration += `${years} year${years > 1 ? "s" : ""}`;
  if (remMonths > 0) {
    if (duration) duration += " and ";
    duration += `${remMonths} month${remMonths > 1 ? "s" : ""}`;
  }
  if (!duration) duration = "less than a month";

  const isFormer = status === "inactive" || status === "terminated";
  return isFormer
    ? `was employed with us for approximately ${duration}`
    : `has been employed with us for approximately ${duration}`;
}

export function printExperienceLetter(data: {
  companyName: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  joiningDate: string;
  status: string;
  totalEarnings: number;
}) {
  const roleLine = [data.designation, data.department].filter(Boolean).join(" — ");
  const today = formatDate(new Date());
  const statusLabel = getEmployeeStatusLabel(data.status);
  const isActive = data.status === "active" || data.status === "on_leave";

  const body = `
    <div class="header">
      <div class="company">${data.companyName}</div>
      <div class="meta">North Nine · Internal HR Document</div>
    </div>
    <p style="text-align:right;font-size:13px;">Date: ${today}</p>
    <h1>TO WHOM IT MAY CONCERN</h1>
    <p><strong>Experience Certificate</strong></p>
    <p>
      This is to certify that <strong>${data.employeeName}</strong>
      (Employee ID: <strong>${data.employeeCode}</strong>)
      ${tenureText(data.joiningDate, data.status)} since
      <strong>${formatDate(data.joiningDate)}</strong>.
    </p>
    ${roleLine ? `<p>During this period, ${isActive ? "they hold" : "they held"} the position of <strong>${roleLine}</strong>.</p>` : ""}
    <p>
      ${isActive ? "They are" : "They were"} recorded in our system with employment status:
      <strong>${statusLabel}</strong>.
      Total verified project earnings credited to their account amount to
      <strong>${formatCurrency(data.totalEarnings)}</strong>.
    </p>
    <p>
      ${isActive ? "They have" : "During their tenure they have"} performed their duties professionally.
      We wish ${isActive ? "them" : "them"} success in future endeavours.
    </p>
    <p>This letter is issued upon request for official purposes only.</p>
    <div class="signatures">
      <div>
        <div class="sign-line">Authorized Signatory</div>
        <div>${data.companyName}</div>
      </div>
      <div>
        <div class="sign-line">HR / Finance</div>
        <div>Employee ID: ${data.employeeCode}</div>
      </div>
    </div>
  `;

  printDocument(`Experience Letter — ${data.employeeName}`, body);
}

export function printSalarySlip(data: {
  companyName: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  email: string;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  projectEarnings: number;
  bonuses: number;
  commissions: number;
  loanRecovery: number;
  savingsContribution: number;
  otherDeductions: number;
  netPay: number;
  paidAt?: string | null;
}) {
  const periodLabel = `${getMonthName(data.periodMonth)} ${data.periodYear}`;
  const gross =
    data.baseSalary +
    data.projectEarnings +
    data.bonuses +
    data.commissions;
  const totalDeductions =
    data.loanRecovery +
    data.savingsContribution +
    data.otherDeductions;

  const body = `
    <div class="header">
      <div class="company">${data.companyName}</div>
      <div class="meta">Salary Slip · ${periodLabel}</div>
    </div>
    <table class="salary-table">
      <tr><th colspan="2">Employee Details</th></tr>
      <tr><td>Name</td><td>${data.employeeName}</td></tr>
      <tr><td>Employee ID</td><td>${data.employeeCode}</td></tr>
      <tr><td>Email</td><td>${data.email}</td></tr>
      <tr><td>Designation</td><td>${data.designation ?? "—"}</td></tr>
      <tr><td>Department</td><td>${data.department ?? "—"}</td></tr>
      <tr><td>Pay Period</td><td>${periodLabel}</td></tr>
      ${data.paidAt ? `<tr><td>Payment Date</td><td>${formatDate(data.paidAt)}</td></tr>` : ""}
    </table>
    <table class="salary-table">
      <tr><th>Earnings</th><th style="width:140px;text-align:right;">Amount (PKR)</th></tr>
      <tr><td>Base Salary</td><td style="text-align:right;">${formatCurrency(data.baseSalary)}</td></tr>
      <tr><td>Project / Freelancer Share</td><td style="text-align:right;">${formatCurrency(data.projectEarnings)}</td></tr>
      <tr><td>Bonuses</td><td style="text-align:right;">${formatCurrency(data.bonuses)}</td></tr>
      <tr><td>Commissions</td><td style="text-align:right;">${formatCurrency(data.commissions)}</td></tr>
      <tr class="total-row"><td>Gross Earnings</td><td style="text-align:right;">${formatCurrency(gross)}</td></tr>
    </table>
    <table class="salary-table">
      <tr><th>Deductions</th><th style="width:140px;text-align:right;">Amount (PKR)</th></tr>
      <tr><td>Loan Recovery</td><td style="text-align:right;">${formatCurrency(data.loanRecovery)}</td></tr>
      <tr><td>Savings Contribution</td><td style="text-align:right;">${formatCurrency(data.savingsContribution)}</td></tr>
      <tr><td>Other Deductions</td><td style="text-align:right;">${formatCurrency(data.otherDeductions)}</td></tr>
      <tr class="total-row"><td>Total Deductions</td><td style="text-align:right;">${formatCurrency(totalDeductions)}</td></tr>
    </table>
    <table class="salary-table">
      <tr class="total-row">
        <td><strong>Net Pay</strong></td>
        <td style="text-align:right;"><strong>${formatCurrency(data.netPay)}</strong></td>
      </tr>
    </table>
    <p style="font-size:11px;color:#555;margin-top:24px;">
      This is a system-generated salary slip for internal records. Generated on ${formatDate(new Date())}.
    </p>
    <div class="signatures">
      <div><div class="sign-line">Prepared By</div></div>
      <div><div class="sign-line">Employee Acknowledgement</div></div>
    </div>
  `;

  printDocument(`Salary Slip — ${data.employeeName} — ${periodLabel}`, body);
}
