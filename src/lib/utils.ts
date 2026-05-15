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
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
}

// ─── Export to Excel ────────────────────────────────────────────────────
export function exportToExcel(data: any[], filename: string, sheetName = 'البيانات') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ─── Canvas Arabic Renderer ─────────────────────────────────────────────
// jsPDF cannot render Arabic natively. This function renders Arabic text
// onto an HTML canvas (which uses the browser's built-in Arabic shaping)
// and returns it as a PNG data URL to embed in the PDF.
function arabicToImage(
  text: string,
  opts: { fontSize?: number; bold?: boolean; color?: string; bgColor?: string } = {}
): { dataUrl: string; widthPx: number; heightPx: number } {
  const { fontSize = 10, bold = false, color = '#1a1a1a', bgColor = 'transparent' } = opts
  const scale = 3 // retina scale for sharp text
  const fontPx = fontSize * scale
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontStr = `${bold ? 'bold ' : ''}${fontPx}px Arial, sans-serif`
  ctx.font = fontStr
  const measured = ctx.measureText(text).width
  const widthPx = Math.ceil(measured) + 16
  const heightPx = Math.ceil(fontPx * 1.4)
  canvas.width = widthPx
  canvas.height = heightPx
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, widthPx, heightPx)
  }
  ctx.font = fontStr
  ctx.fillStyle = color
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, widthPx - 4, heightPx / 2)
  return { dataUrl: canvas.toDataURL('image/png'), widthPx, heightPx }
}

// Convert canvas pixels to PDF mm units (1px = 0.264583mm at 96dpi, but we used scale=3)
function pxToMm(px: number, scale = 3): number {
  return (px / scale) * 0.264583
}

// ─── Export to PDF ──────────────────────────────────────────────────────
export function exportToPDF(
  title: string,
  headers: string[],
  rows: any[][],
  filename: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.width

  // ── Title ──
  const titleImg = arabicToImage(title, { fontSize: 16, bold: true, color: '#1a1a1a' })
  const titleMmW = Math.min(pxToMm(titleImg.widthPx), pageWidth - 20)
  const titleMmH = pxToMm(titleImg.heightPx)
  doc.addImage(titleImg.dataUrl, 'PNG', (pageWidth - titleMmW) / 2, 6, titleMmW, titleMmH)

  // ── Print date ──
  const dateStr = `تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}`
  const dateImg = arabicToImage(dateStr, { fontSize: 9, color: '#555555' })
  const dateMmW = Math.min(pxToMm(dateImg.widthPx), 70)
  const dateMmH = pxToMm(dateImg.heightPx)
  doc.addImage(dateImg.dataUrl, 'PNG', pageWidth - dateMmW - 5, 20, dateMmW, dateMmH)

  // ── Table: use placeholder spaces so autoTable draws cells/borders,
  //    then we overdraw each cell with the Arabic canvas image ──
  const blankHeaders = headers.map(() => ' ')
  const blankRows = rows.map(r => r.map(() => ' '))

  // Pre-render header images (white text on orange)
  const headerImgs = headers.map(h =>
    arabicToImage(h, { fontSize: 9, bold: true, color: '#ffffff' })
  )
  // Pre-render body cell images
  const bodyImgs = rows.map(row =>
    row.map(cell => {
      const str = cell === null || cell === undefined ? '' : String(cell)
      return arabicToImage(str, { fontSize: 9, color: '#1a1a1a' })
    })
  )

  autoTable(doc, {
    head: [blankHeaders],
    body: blankRows,
    startY: 28,
    styles: {
      fontSize: 9,
      cellPadding: 2,
      halign: 'right',
      minCellHeight: 9,
    },
    headStyles: {
      fillColor: [232, 76, 30],
      textColor: [255, 255, 255],
      minCellHeight: 9,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawCell: (data) => {
      const { section, column, row, cell } = data
      const col = column.index
      const rowIdx = row.index

      let img: { dataUrl: string; widthPx: number; heightPx: number }
      if (section === 'head') {
        if (col >= headerImgs.length) return
        img = headerImgs[col]
      } else {
        if (rowIdx >= bodyImgs.length || col >= bodyImgs[rowIdx].length) return
        img = bodyImgs[rowIdx][col]
      }

      // Fit image inside cell, right-aligned with small padding
      const pad = 1
      const maxW = cell.width - pad * 2
      const maxH = cell.height - pad * 2
      const imgMmW = Math.min(pxToMm(img.widthPx), maxW)
      const imgMmH = Math.min(pxToMm(img.heightPx), maxH)
      // Right-align: start x = cell right edge - padding - image width
      const x = cell.x + cell.width - pad - imgMmW
      const y = cell.y + (cell.height - imgMmH) / 2
      doc.addImage(img.dataUrl, 'PNG', x, y, imgMmW, imgMmH)
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
