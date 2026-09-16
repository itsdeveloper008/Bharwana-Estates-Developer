"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ReportTable = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
};

export function downloadReportPdf(table: ReportTable, filename: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(table.title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(table.subtitle, 40, 58);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 72,
    head: [table.columns],
    body: table.rows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [31, 107, 79], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 246, 241] },
  });

  doc.save(filename);
}
