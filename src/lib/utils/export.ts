import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      return String(val).includes(",") ? `"${val}"` : String(val);
    })
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadBlob(csv, `${filename}.csv`, "text/csv");
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = "Report"
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  title: string
) {
  if (!data.length) return;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => String(row[h] ?? "")));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8 },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
