import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Excel Buffer ────────────────────────────────────────────────────────
export function generateExcelBuffer(data: any[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ─── PDF Buffer (Arabic-safe using HTML) ─────────────────────────────────
export async function generatePDFBuffer(title: string, headers: string[], rows: any[][]): Promise<Buffer> {
  const date = new Date().toLocaleDateString('ar-SA')

  const tableHeaders = headers.map(h => `<th>${h}</th>`).join('')
  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`
  ).join('')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          direction: rtl;
          padding: 20px;
          font-size: 11px;
        }
        h2 {
          text-align: center;
          color: #e84c1e;
          margin-bottom: 5px;
        }
        .date {
          text-align: left;
          color: #666;
          margin-bottom: 15px;
          font-size: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #e84c1e;
          color: white;
          padding: 6px 8px;
          border: 1px solid #ccc;
          text-align: right;
          font-size: 10px;
        }
        td {
          padding: 5px 8px;
          border: 1px solid #ddd;
          text-align: right;
          font-size: 10px;
        }
        tr:nth-child(even) {
          background: #f5f5f5;
        }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <div class="date">تاريخ الطباعة: ${date}</div>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `

  const htmlPdf = require('html-pdf-node')
  const file = { content: html }
  const options = { format: 'A4', landscape: true }
  const pdfBuffer = await htmlPdf.generatePdf(file, options)
  return pdfBuffer
}

// ─── Data Fetchers ────────────────────────────────────────────────────────
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
    fetchPDF: async () => { const d = await fetchWorks(); return { buffer: await generatePDFBuffer('تقرير الأعمال', d.headers, d.rows), filename: `تقرير-الأعمال-${today()}.pdf` } },
  },
  workers: {
    label: 'تقرير العمال', emoji: '👷',
    fetchExcel: async () => { const d = await fetchWorkers(); return { buffer: generateExcelBuffer(d.objects, 'العمال'), filename: `تقرير-العمال-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchWorkers(); return { buffer: await generatePDFBuffer('تقرير العمال', d.headers, d.rows), filename: `تقرير-العمال-${today()}.pdf` } },
  },
  vehicles: {
    label: 'تقرير المركبات', emoji: '🚗',
    fetchExcel: async () => { const d = await fetchVehicles(); return { buffer: generateExcelBuffer(d.objects, 'المركبات'), filename: `تقرير-المركبات-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchVehicles(); return { buffer: await generatePDFBuffer('تقرير المركبات', d.headers, d.rows), filename: `تقرير-المركبات-${today()}.pdf` } },
  },
  tools: {
    label: 'تقرير العدة والمعدات', emoji: '🔧',
    fetchExcel: async () => { const d = await fetchTools(); return { buffer: generateExcelBuffer(d.objects, 'العدة'), filename: `تقرير-العدة-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchTools(); return { buffer: await generatePDFBuffer('تقرير العدة والمعدات', d.headers, d.rows), filename: `تقرير-العدة-${today()}.pdf` } },
  },
  inventory: {
    label: 'تقرير المخزون', emoji: '📦',
    fetchExcel: async () => { const d = await fetchInventory(); return { buffer: generateExcelBuffer(d.objects, 'المخزون'), filename: `تقرير-المخزون-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchInventory(); return { buffer: await generatePDFBuffer('تقرير المخزون', d.headers, d.rows), filename: `تقرير-المخزون-${today()}.pdf` } },
  },
  approvals: {
    label: 'تقرير الاعتمادات', emoji: '✅',
    fetchExcel: async () => { const d = await fetchApprovals(); return { buffer: generateExcelBuffer(d.objects, 'الاعتمادات'), filename: `تقرير-الاعتمادات-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchApprovals(); return { buffer: await generatePDFBuffer('تقرير الاعتمادات', d.headers, d.rows), filename: `تقرير-الاعتمادات-${today()}.pdf` } },
  },
  custody: {
    label: 'تقرير العهدة', emoji: '🗃️',
    fetchExcel: async () => { const d = await fetchCustody(); return { buffer: generateExcelBuffer(d.objects, 'العهدة'), filename: `تقرير-العهدة-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchCustody(); return { buffer: await generatePDFBuffer('تقرير العهدة', d.headers, d.rows), filename: `تقرير-العهدة-${today()}.pdf` } },
  },
  documents: {
    label: 'تقرير المستندات', emoji: '📄',
    fetchExcel: async () => { const d = await fetchDocuments(); return { buffer: generateExcelBuffer(d.objects, 'المستندات'), filename: `تقرير-المستندات-${today()}.xlsx` } },
    fetchPDF: async () => { const d = await fetchDocuments(); return { buffer: await generatePDFBuffer('تقرير المستندات', d.headers, d.rows), filename: `تقرير-المستندات-${today()}.pdf` } },
  },
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}
