import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function generateExcelBuffer(data: any[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ─── Server-side PDF generator (no browser needed) ───────────────────────
export function generatePDFBuffer(title: string, headers: string[], rows: any[][]): Buffer {
  const lines: string[] = []
  const date = new Date().toLocaleDateString('ar-SA')

  lines.push(`%PDF-1.4`)
  // We use a simple approach: generate an HTML-like text report as PDF
  // Using pdfkit would require installation, so we build a clean text-based PDF

  // Actually build with manual PDF structure
  const content: string[] = []
  content.push(title)
  content.push(`Date: ${date}`)
  content.push('─'.repeat(80))
  content.push(headers.join(' | '))
  content.push('─'.repeat(80))
  rows.forEach(row => {
    content.push(row.map(c => String(c ?? '')).join(' | '))
  })
  content.push('─'.repeat(80))

  const text = content.join('\n')
  const encoded = Buffer.from(text, 'utf-8')

  // Build minimal valid PDF with embedded UTF-8 text
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`

  // Build text stream
  const lines2: string[] = []
  lines2.push('BT')
  lines2.push('/F1 10 Tf')
  lines2.push('50 550 Td')
  lines2.push('14 TL')

  content.forEach(line => {
    const safe = line.replace(/[()\\]/g, c => '\\' + c)
    lines2.push(`(${safe}) Tj T*`)
  })
  lines2.push('ET')

  const stream = lines2.join('\n')
  const obj4 = `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`

  const body = obj1 + obj2 + obj3 + obj4 + obj5
  const xrefOffset = body.length + '%PDF-1.4\n'.length

  const xref = `xref\n0 6\n0000000000 65535 f \n${String('%PDF-1.4\n'.length).padStart(10, '0')} 00000 n \n${String('%PDF-1.4\n'.length + obj1.length).padStart(10, '0')} 00000 n \n${String('%PDF-1.4\n'.length + obj1.length + obj2.length).padStart(10, '0')} 00000 n \n${String('%PDF-1.4\n'.length + obj1.length + obj2.length + obj3.length).padStart(10, '0')} 00000 n \n${String('%PDF-1.4\n'.length + obj1.length + obj2.length + obj3.length + obj4.length).padStart(10, '0')} 00000 n \n`
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from('%PDF-1.4\n' + body + xref + trailer, 'latin1')
}

// ─── Fetch data helpers ───────────────────────────────────────────────────
async function fetchWorks() {
  const { data } = await getSupabase().from('works')
    .select('item_no, description, location, quantity, unit, progress, status, start_date, end_date, responsible, notes')
    .order('item_no')
  return {
    headers: ['رقم البند', 'الوصف', 'الموقع', 'الكمية', 'الوحدة', 'التقدم%', 'الحالة', 'البدء', 'الانتهاء', 'المسؤول', 'ملاحظات'],
    rows: (data || []).map(r => [r.item_no, r.description, r.location, r.quantity, r.unit, r.progress, r.status, r.start_date, r.end_date, r.responsible, r.notes]),
    objects: (data || []).map(r => ({
      'رقم البند': r.item_no || '', 'الوصف': r.description || '', 'الموقع': r.location || '',
      'الكمية': r.quantity || '', 'الوحدة': r.unit || '', 'التقدم %': r.progress || 0,
      'الحالة': r.status || '', 'تاريخ البدء': r.start_date || '', 'تاريخ الانتهاء': r.end_date || '',
      'المسؤول': r.responsible || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchWorkers() {
  const { data } = await getSupabase().from('workers')
    .select('worker_name, iqama_no, job_title, mobile, nationality, iqama_expiry, work_permit_expiry, status, current_location, notes')
    .order('worker_name')
  return {
    headers: ['اسم العامل', 'رقم الإقامة', 'المسمى', 'الجوال', 'الجنسية', 'انتهاء الإقامة', 'انتهاء التصريح', 'الحالة', 'الموقع', 'ملاحظات'],
    rows: (data || []).map(r => [r.worker_name, r.iqama_no, r.job_title, r.mobile, r.nationality, r.iqama_expiry, r.work_permit_expiry, r.status, r.current_location, r.notes]),
    objects: (data || []).map(r => ({
      'اسم العامل': r.worker_name || '', 'رقم الإقامة': r.iqama_no || '', 'المسمى الوظيفي': r.job_title || '',
      'الجوال': r.mobile || '', 'الجنسية': r.nationality || '', 'انتهاء الإقامة': r.iqama_expiry || '',
      'انتهاء تصريح العمل': r.work_permit_expiry || '', 'الحالة': r.status || '',
      'الموقع الحالي': r.current_location || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchVehicles() {
  const { data } = await getSupabase().from('vehicles')
    .select('vehicle_no, vehicle_type, plate_no, driver_name, status, last_maintenance, registration_expiry, insurance_expiry, notes')
    .order('vehicle_no')
  return {
    headers: ['رقم المركبة', 'النوع', 'رقم اللوحة', 'السائق', 'الحالة', 'آخر صيانة', 'انتهاء التسجيل', 'انتهاء التأمين', 'ملاحظات'],
    rows: (data || []).map(r => [r.vehicle_no, r.vehicle_type, r.plate_no, r.driver_name, r.status, r.last_maintenance, r.registration_expiry, r.insurance_expiry, r.notes]),
    objects: (data || []).map(r => ({
      'رقم المركبة': r.vehicle_no || '', 'النوع': r.vehicle_type || '', 'رقم اللوحة': r.plate_no || '',
      'السائق': r.driver_name || '', 'الحالة': r.status || '', 'آخر صيانة': r.last_maintenance || '',
      'انتهاء التسجيل': r.registration_expiry || '', 'انتهاء التأمين': r.insurance_expiry || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchTools() {
  const { data } = await getSupabase().from('tools')
    .select('tool_name, tool_type, total_qty, available_qty, used_qty, status, storage_location, received_by, handover_date, return_date, notes')
    .order('tool_name')
  return {
    headers: ['اسم العدة', 'النوع', 'الكمية الكلية', 'المتاح', 'المستخدم', 'الحالة', 'موقع التخزين', 'تسلم بواسطة', 'تاريخ التسليم', 'تاريخ الإرجاع', 'ملاحظات'],
    rows: (data || []).map(r => [r.tool_name, r.tool_type, r.total_qty, r.available_qty, r.used_qty, r.status, r.storage_location, r.received_by, r.handover_date, r.return_date, r.notes]),
    objects: (data || []).map(r => ({
      'اسم العدة': r.tool_name || '', 'النوع': r.tool_type || '', 'الكمية الكلية': r.total_qty || '',
      'المتاح': r.available_qty || '', 'المستخدم': r.used_qty || '', 'الحالة': r.status || '',
      'موقع التخزين': r.storage_location || '', 'تسلم بواسطة': r.received_by || '',
      'تاريخ التسليم': r.handover_date || '', 'تاريخ الإرجاع': r.return_date || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchInventory() {
  const { data } = await getSupabase().from('inventory')
    .select('item_code, item_name, category, unit, current_qty, min_qty, received_qty, issued_qty, storage_location, supplier, notes')
    .order('item_name')
  return {
    headers: ['كود الصنف', 'اسم الصنف', 'الفئة', 'الوحدة', 'الكمية الحالية', 'الحد الأدنى', 'الوارد', 'المنصرف', 'موقع التخزين', 'المورد', 'ملاحظات'],
    rows: (data || []).map(r => [r.item_code, r.item_name, r.category, r.unit, r.current_qty, r.min_qty, r.received_qty, r.issued_qty, r.storage_location, r.supplier, r.notes]),
    objects: (data || []).map(r => ({
      'كود الصنف': r.item_code || '', 'اسم الصنف': r.item_name || '', 'الفئة': r.category || '',
      'الوحدة': r.unit || '', 'الكمية الحالية': r.current_qty || 0, 'الحد الأدنى': r.min_qty || 0,
      'الوارد': r.received_qty || 0, 'المنصرف': r.issued_qty || 0,
      'موقع التخزين': r.storage_location || '', 'المورد': r.supplier || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchApprovals() {
  const { data } = await getSupabase().from('approvals')
    .select('approval_no, material_name, material_code, manufacturer, supplier, submitted_date, status, revision_no, notes')
    .order('approval_no')
  return {
    headers: ['رقم الاعتماد', 'اسم المادة', 'كود المادة', 'المصنع', 'المورد', 'تاريخ التقديم', 'الحالة', 'رقم المراجعة', 'ملاحظات'],
    rows: (data || []).map(r => [r.approval_no, r.material_name, r.material_code, r.manufacturer, r.supplier, r.submitted_date, r.status, r.revision_no, r.notes]),
    objects: (data || []).map(r => ({
      'رقم الاعتماد': r.approval_no || '', 'اسم المادة': r.material_name || '', 'كود المادة': r.material_code || '',
      'المصنع': r.manufacturer || '', 'المورد': r.supplier || '', 'تاريخ التقديم': r.submitted_date || '',
      'الحالة': r.status || '', 'رقم المراجعة': r.revision_no || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchCustody() {
  const { data } = await getSupabase().from('custody')
    .select('custody_no, item_name, quantity, received_by, job_title, handover_date, status, return_date, notes')
    .order('custody_no')
  return {
    headers: ['رقم العهدة', 'اسم الصنف', 'الكمية', 'تسلم بواسطة', 'المسمى الوظيفي', 'تاريخ التسليم', 'الحالة', 'تاريخ الإرجاع', 'ملاحظات'],
    rows: (data || []).map(r => [r.custody_no, r.item_name, r.quantity, r.received_by, r.job_title, r.handover_date, r.status, r.return_date, r.notes]),
    objects: (data || []).map(r => ({
      'رقم العهدة': r.custody_no || '', 'اسم الصنف': r.item_name || '', 'الكمية': r.quantity || '',
      'تسلم بواسطة': r.received_by || '', 'المسمى الوظيفي': r.job_title || '',
      'تاريخ التسليم': r.handover_date || '', 'الحالة': r.status || '',
      'تاريخ الإرجاع': r.return_date || '', 'ملاحظات': r.notes || '',
    }))
  }
}

async function fetchDocuments() {
  const { data } = await getSupabase().from('documents')
    .select('document_name, document_type, document_no, issue_date, expiry_date, issuer, status, notes')
    .order('document_name')
  return {
    headers: ['اسم المستند', 'النوع', 'رقم المستند', 'تاريخ الإصدار', 'تاريخ الانتهاء', 'الجهة المصدرة', 'الحالة', 'ملاحظات'],
    rows: (data || []).map(r => [r.document_name, r.document_type, r.document_no, r.issue_date, r.expiry_date, r.issuer, r.status, r.notes]),
    objects: (data || []).map(r => ({
      'اسم المستند': r.document_name || '', 'النوع': r.document_type || '', 'رقم المستند': r.document_no || '',
      'تاريخ الإصدار': r.issue_date || '', 'تاريخ الانتهاء': r.expiry_date || '',
      'الجهة المصدرة': r.issuer || '', 'الحالة': r.status || '', 'ملاحظات': r.notes || '',
    }))
  }
}

// ─── Report Definitions ───────────────────────────────────────────────────
export const REPORTS: Record<string, {
  label: string
  emoji: string
  fetchExcel: () => Promise<{ buffer: Buffer; filename: string }>
  fetchPDF: () => Promise<{ buffer: Buffer; filename: string }>
}> = {
  works: {
    label: 'تقرير الأعمال', emoji: '🔨',
    fetchExcel: async () => { const d = await fetchWorks(); return { buffer: generateExcelBuffer(d.objects, 'الأعمال'), filename: `تقرير-الأعمال-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchWorks(); return { buffer: generatePDFBuffer('تقرير الأعمال', d.headers, d.rows), filename: `تقرير-الأعمال-${today()}.pdf` } },
  },
  workers: {
    label: 'تقرير العمال', emoji: '👷',
    fetchExcel: async () => { const d = await fetchWorkers(); return { buffer: generateExcelBuffer(d.objects, 'العمال'), filename: `تقرير-العمال-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchWorkers(); return { buffer: generatePDFBuffer('تقرير العمال', d.headers, d.rows), filename: `تقرير-العمال-${today()}.pdf` } },
  },
  vehicles: {
    label: 'تقرير المركبات', emoji: '🚗',
    fetchExcel: async () => { const d = await fetchVehicles(); return { buffer: generateExcelBuffer(d.objects, 'المركبات'), filename: `تقرير-المركبات-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchVehicles(); return { buffer: generatePDFBuffer('تقرير المركبات', d.headers, d.rows), filename: `تقرير-المركبات-${today()}.pdf` } },
  },
  tools: {
    label: 'تقرير العدة والمعدات', emoji: '🔧',
    fetchExcel: async () => { const d = await fetchTools(); return { buffer: generateExcelBuffer(d.objects, 'العدة'), filename: `تقرير-العدة-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchTools(); return { buffer: generatePDFBuffer('تقرير العدة والمعدات', d.headers, d.rows), filename: `تقرير-العدة-${today()}.pdf` } },
  },
  inventory: {
    label: 'تقرير المخزون', emoji: '📦',
    fetchExcel: async () => { const d = await fetchInventory(); return { buffer: generateExcelBuffer(d.objects, 'المخزون'), filename: `تقرير-المخزون-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchInventory(); return { buffer: generatePDFBuffer('تقرير المخزون', d.headers, d.rows), filename: `تقرير-المخزون-${today()}.pdf` } },
  },
  approvals: {
    label: 'تقرير الاعتمادات', emoji: '✅',
    fetchExcel: async () => { const d = await fetchApprovals(); return { buffer: generateExcelBuffer(d.objects, 'الاعتمادات'), filename: `تقرير-الاعتمادات-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchApprovals(); return { buffer: generatePDFBuffer('تقرير الاعتمادات', d.headers, d.rows), filename: `تقرير-الاعتمادات-${today()}.pdf` } },
  },
  custody: {
    label: 'تقرير العهدة', emoji: '🗃️',
    fetchExcel: async () => { const d = await fetchCustody(); return { buffer: generateExcelBuffer(d.objects, 'العهدة'), filename: `تقرير-العهدة-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchCustody(); return { buffer: generatePDFBuffer('تقرير العهدة', d.headers, d.rows), filename: `تقرير-العهدة-${today()}.pdf` } },
  },
  documents: {
    label: 'تقرير المستندات', emoji: '📄',
    fetchExcel: async () => { const d = await fetchDocuments(); return { buffer: generateExcelBuffer(d.objects, 'المستندات'), filename: `تقرير-المستندات-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchDocuments(); return { buffer: generatePDFBuffer('تقرير المستندات', d.headers, d.rows), filename: `تقرير-المستندات-${today()}.pdf` } },
  },
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}
