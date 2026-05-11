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

// ─── Export to PDF ──────────────────────────────────────────────────────
export function exportToPDF(title: string, headers: string[], rows: any[][], filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, doc.internal.pageSize.width / 2, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}`, doc.internal.pageSize.width - 20, 22, { align: 'right' })

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [232, 76, 30], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
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
