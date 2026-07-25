import { jsPDF } from 'jspdf';
import { BRAND } from './brand';
import type { Student, TestReport } from './types';

export function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

export function pctOf(marks: number, outOf: number): number {
  if (!outOf) return 0;
  return Math.round((marks / outOf) * 100);
}

export async function downloadReportCard(
  student: Student,
  reports: TestReport[],
  dailyResults: { subject: string | null; percentage: number; score: number; total: number; created_at: string }[],
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header band
  doc.setFillColor(0, 82, 255);
  doc.rect(0, 0, W, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(BRAND.name, M, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.address, M, 56);
  doc.text(`Phone: ${BRAND.phone}  |  Est: ${BRAND.est}`, M, 72);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Student Report Card', M, 120);

  // Student info box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, 130, W - M * 2, 90, 6, 6, 'FD');

  // Photo (circle placeholder)
  try {
    if (student.photo_url) {
      const img = await fetchImageAsDataUrl(student.photo_url);
      if (img) {
        doc.addImage(img, 'JPEG', W - M - 70, 140, 70, 70);
      }
    }
  } catch {
    // skip photo if it fails
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(student.name, M + 16, 152);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Roll No: ${student.roll_no}`, M + 16, 170);
  doc.text(`Class: ${student.class}${student.stream ? ' (' + student.stream + ')' : ''}`, M + 16, 186);
  doc.text(`School: ${student.school || '-'}`, M + 16, 202);
  doc.text(`Parent: ${student.parent_name || '-'}  |  ${student.parent_phone || '-'}`, M + 16, 218);

  // Marks table
  let y = 245;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Test Results', M, y);
  y += 14;

  const colX = [M, M + 130, M + 240, M + 320, M + 400];
  const headers = ['Subject', 'Type', 'Marks', 'Out Of', '%'];
  doc.setFillColor(0, 82, 255);
  doc.rect(M, y, W - M * 2, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  headers.forEach((h, i) => doc.text(h, colX[i], y + 15));
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const all = [
    ...reports.map((r) => ({
      subject: r.subject,
      type: r.test_type,
      marks: r.marks,
      outOf: r.out_of,
      pct: pctOf(r.marks, r.out_of),
    })),
    ...dailyResults.map((d) => ({
      subject: d.subject || 'MCQ',
      type: 'Daily MCQ',
      marks: d.score,
      outOf: d.total,
      pct: Math.round(d.percentage),
    })),
  ];

  all.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(M, y, W - M * 2, 20, 'F');
    }
    doc.text(String(row.subject), colX[0], y + 14);
    doc.text(String(row.type), colX[1], y + 14);
    doc.text(String(row.marks), colX[2], y + 14);
    doc.text(String(row.outOf), colX[3], y + 14);
    doc.text(`${row.pct}%`, colX[4], y + 14);
    y += 20;
    if (y > 760) {
      doc.addPage();
      y = 60;
    }
  });

  // Summary
  y += 10;
  if (y > 740) {
    doc.addPage();
    y = 60;
  }
  const avg =
    all.length > 0
      ? Math.round(all.reduce((s, r) => s + r.pct, 0) / all.length)
      : 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Overall Average: ${avg}%   Grade: ${gradeFor(avg)}`, M, y + 14);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${BRAND.name}  |  ${BRAND.phone}  |  Generated on ${new Date().toLocaleDateString()}`,
    M,
    820,
  );

  doc.save(`ReportCard_${student.roll_no}.pdf`);
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function shareReportOnWhatsapp(student: Student, avg: number) {
  const text = `*${BRAND.name}* - Report Card%0A%0AStudent: ${student.name}%0ARoll No: ${student.roll_no}%0AClass: ${student.class}${student.stream ? ' (' + student.stream + ')' : ''}%0AOverall Average: ${avg}% (${gradeFor(avg)})%0A%0AGenerated: ${new Date().toLocaleDateString()}%0A%0AContact: ${BRAND.phone}`;
  window.open(`${BRAND.whatsapp}?text=${text}`, '_blank');
}
