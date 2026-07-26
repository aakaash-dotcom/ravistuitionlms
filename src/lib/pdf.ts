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

// Download a report card for a specific period (one week or one month)
export async function downloadPeriodReportCard(
  student: Student,
  periodReports: TestReport[],
  periodLabel: string,
  mode: 'Weekly' | 'Monthly',
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header band
  doc.setFillColor(0, 82, 255);
  doc.rect(0, 0, W, 100, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(BRAND.name, M + 50, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.address, M + 50, 56);
  doc.text(`Phone: ${BRAND.phone}  |  Est: ${BRAND.est}`, M + 50, 72);

  // Logo
  try {
    const logo = await fetchImageAsDataUrl(BRAND.logo);
    if (logo) {
      doc.addImage(logo, 'PNG', M, 18, 36, 36);
    }
  } catch {
    // skip logo if it fails
  }

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${mode} Report Card — ${periodLabel}`, M, 130);

  // Student info box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, 140, W - M * 2, 100, 6, 6, 'FD');

  // Photo
  try {
    if (student.photo_url) {
      const img = await fetchImageAsDataUrl(student.photo_url);
      if (img) {
        doc.addImage(img, 'JPEG', W - M - 70, 150, 70, 70);
      }
    }
  } catch {
    // skip photo
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(student.name, M + 16, 162);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Roll No: ${student.roll_no}`, M + 16, 180);
  doc.text(`Class: ${student.class}${student.stream ? ' (' + student.stream + ')' : ''}`, M + 16, 196);
  doc.text(`School: ${student.school || '-'}`, M + 16, 212);
  doc.text(`Parent: ${student.parent_name || '-'}  |  ${student.parent_phone || '-'}`, M + 16, 228);

  // Marks table
  let y = 265;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Subject Results', M, y);
  y += 14;

  const colX = [M, M + 160, M + 280, M + 360, M + 440];
  const headers = ['Subject', 'Marks', 'Out Of', '%', 'Grade'];
  doc.setFillColor(0, 82, 255);
  doc.rect(M, y, W - M * 2, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  headers.forEach((h, i) => doc.text(h, colX[i], y + 15));
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  let totalMarks = 0;
  let totalOutOf = 0;

  periodReports.forEach((r, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(M, y, W - M * 2, 20, 'F');
    }
    const pct = pctOf(Number(r.marks), Number(r.out_of));
    doc.text(String(r.subject), colX[0], y + 14);
    doc.text(String(r.marks), colX[1], y + 14);
    doc.text(String(r.out_of), colX[2], y + 14);
    doc.text(`${pct}%`, colX[3], y + 14);
    doc.text(gradeFor(pct), colX[4], y + 14);
    totalMarks += Number(r.marks);
    totalOutOf += Number(r.out_of);
    y += 20;
  });

  // Total row
  doc.setFillColor(226, 232, 240);
  doc.rect(M, y, W - M * 2, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Total', colX[0], y + 16);
  doc.text(String(totalMarks), colX[1], y + 16);
  doc.text(String(totalOutOf), colX[2], y + 16);
  const totalPct = pctOf(totalMarks, totalOutOf);
  doc.text(`${totalPct}%`, colX[3], y + 16);
  doc.text(gradeFor(totalPct), colX[4], y + 16);
  y += 34;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${BRAND.name}  |  ${BRAND.phone}  |  Generated on ${new Date().toLocaleDateString()}`,
    M,
    820,
  );

  const fileName = `ReportCard_${student.roll_no}_${mode}_${periodLabel.replace(/\s/g, '')}.pdf`;
  doc.save(fileName);
}

export function sharePeriodReportOnWhatsapp(
  student: Student,
  periodLabel: string,
  mode: 'Weekly' | 'Monthly',
  avg: number,
) {
  const text = `*${BRAND.name}* - ${mode} Report Card%0A%0AStudent: ${student.name}%0ARoll No: ${student.roll_no}%0AClass: ${student.class}${student.stream ? ' (' + student.stream + ')' : ''}%0APeriod: ${periodLabel}%0AAverage: ${avg}% (${gradeFor(avg)})%0A%0AGenerated: ${new Date().toLocaleDateString()}%0A%0AContact: ${BRAND.phone}`;
  window.open(`${BRAND.whatsapp}?text=${text}`, '_blank');
}
