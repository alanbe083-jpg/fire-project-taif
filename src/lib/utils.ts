import { supabase } from './supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Activity Logging ───────────────────────────────────────────────────
export async function logActivity({
  userId, userName, actionType, sectionName, recordId, oldData, newData
}: {
  userId: string; userName: string; actionType: string
  sectionName?: string; recordId?: string; oldData?: any; newData?: any
}) {
  await supabase.from('activity_log').insert({
    user_id: userId, user_name: userName, action_type: actionType,
    section_name: sectionName, record_id: recordId,
    old_data: oldData, new_data: newData
  })
}

// ─── Date Helpers ───────────────────────────────────────────────────────
export function daysUntilExpiry(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(dateStr?: string | null, days = 30): boolean {
  const d = daysUntilExpiry(dateStr)
  return d !== null && d <= days && d >= 0
}

export function isExpired(dateStr?: string | null): boolean {
  const d = daysUntilExpiry(dateStr)
  return d !== null && d < 0
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ─── Export to Excel ────────────────────────────────────────────────────
export function exportToExcel(data: any[], filename: string, sheetName = 'البيانات') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ─── Arabic Text Helper ─────────────────────────────────────────────────
// Reverses Arabic text so jsPDF renders it correctly right-to-left
function fixArabic(text: string): string {
  if (!text || typeof text !== 'string') return text ?? ''
  // Check if text contains Arabic characters
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  if (!hasArabic) return text
  // Reverse the string to fix RTL rendering in jsPDF
  return text.split('').reverse().join('')
}

function fixArabicRow(row: any[]): any[] {
  return row.map(cell => {
    if (typeof cell === 'string') return fixArabic(cell)
    return cell
  })
}

// ─── Export to PDF ──────────────────────────────────────────────────────
export function exportToPDF(title: string, headers: string[], rows: any[][], filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.width

  // Title (Arabic reversed for correct rendering)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(fixArabic(title), pageWidth / 2, 15, { align: 'center' })

  // Print date
  doc.setFontSize(10)
  const printDate = `${fixArabic('تاريخ الطباعة')}: ${new Date().toLocaleDateString('ar-SA')}`
  doc.text(printDate, pageWidth - 20, 22, { align: 'right' })

  // Fix Arabic in headers and rows
  const fixedHeaders = headers.map(h => fixArabic(h))
  const fixedRows = rows.map(row => fixArabicRow(row))

  autoTable(doc, {
    head: [fixedHeaders],
    body: fixedRows,
    startY: 28,
    // RTL column order — reverse columns so right-most is first
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'right',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [232, 76, 30],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'right',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    // Reverse column order to match Arabic RTL reading direction
    didParseCell: (data) => {
      if (data.section === 'head' || data.section === 'body') {
        data.cell.styles.halign = 'right'
      }
    },
  })

  doc.save(`${filename}.pdf`)
}

// ─── Status Badge Color ─────────────────────────────────────────────────
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'نشط': 'bg-emerald-500/20 text-emerald-400',
    'منجز': 'bg-emerald-500/20 text-emerald-400',
    'معتمد': 'bg-emerald-500/20 text-emerald-400',
    'ساري': 'bg-emerald-500/20 text-emerald-400',
    'متاح': 'bg-emerald-500/20 text-emerald-400',
    'جاري التنفيذ': 'bg-blue-500/20 text-blue-400',
    'تحت المراجعة': 'bg-amber-500/20 text-amber-400',
    'في العهدة': 'bg-amber-500/20 text-amber-400',
    'قيد التجديد': 'bg-amber-500/20 text-amber-400',
    'إجازة': 'bg-amber-500/20 text-amber-400',
    'في الصيانة': 'bg-amber-500/20 text-amber-400',
    'لم يبدأ': 'bg-slate-500/20 text-slate-400',
    'متوقف': 'bg-orange-500/20 text-orange-400',
    'مرفوض': 'bg-red-500/20 text-red-400',
    'منتهي': 'bg-red-500/20 text-red-400',
    'تالف': 'bg-red-500/20 text-red-400',
    'مفقود': 'bg-red-500/20 text-red-400',
    'يحتاج تعديل': 'bg-purple-500/20 text-purple-400',
  }
  return map[status] || 'bg-slate-500/20 text-slate-400'
}
