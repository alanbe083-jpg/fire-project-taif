import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Server-side Supabase client (used in API routes)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Generate Excel Buffer (server-side, no browser needed) ─────────────
export function generateExcelBuffer(data: any[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ─── Report Definitions ──────────────────────────────────────────────────
export const REPORTS: Record<string, {
  label: string
  emoji: string
  fetch: () => Promise<{ buffer: Buffer; filename: string }>
}> = {
  works: {
    label: 'تقرير الأعمال',
    emoji: '🔨',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('works')
        .select('item_no, description, location, quantity, unit, progress, status, start_date, end_date, responsible, notes')
        .order('item_no')
      const rows = (data || []).map(r => ({
        'رقم البند': r.item_no || '',
        'الوصف': r.description || '',
        'الموقع': r.location || '',
        'الكمية': r.quantity || '',
        'الوحدة': r.unit || '',
        'التقدم %': r.progress || 0,
        'الحالة': r.status || '',
        'تاريخ البدء': r.start_date || '',
        'تاريخ الانتهاء': r.end_date || '',
        'المسؤول': r.responsible || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'الأعمال'),
        filename: `تقرير-الأعمال-${today()}.xlsx`
      }
    }
  },

  workers: {
    label: 'تقرير العمال',
    emoji: '👷',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('workers')
        .select('worker_name, iqama_no, job_title, mobile, nationality, iqama_expiry, work_permit_expiry, status, current_location, notes')
        .order('worker_name')
      const rows = (data || []).map(r => ({
        'اسم العامل': r.worker_name || '',
        'رقم الإقامة': r.iqama_no || '',
        'المسمى الوظيفي': r.job_title || '',
        'الجوال': r.mobile || '',
        'الجنسية': r.nationality || '',
        'انتهاء الإقامة': r.iqama_expiry || '',
        'انتهاء تصريح العمل': r.work_permit_expiry || '',
        'الحالة': r.status || '',
        'الموقع الحالي': r.current_location || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'العمال'),
        filename: `تقرير-العمال-${today()}.xlsx`
      }
    }
  },

  vehicles: {
    label: 'تقرير المركبات',
    emoji: '🚗',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('vehicles')
        .select('vehicle_no, vehicle_type, plate_no, driver_name, status, last_maintenance, registration_expiry, insurance_expiry, notes')
        .order('vehicle_no')
      const rows = (data || []).map(r => ({
        'رقم المركبة': r.vehicle_no || '',
        'النوع': r.vehicle_type || '',
        'رقم اللوحة': r.plate_no || '',
        'السائق': r.driver_name || '',
        'الحالة': r.status || '',
        'آخر صيانة': r.last_maintenance || '',
        'انتهاء التسجيل': r.registration_expiry || '',
        'انتهاء التأمين': r.insurance_expiry || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'المركبات'),
        filename: `تقرير-المركبات-${today()}.xlsx`
      }
    }
  },

  tools: {
    label: 'تقرير العدة والمعدات',
    emoji: '🔧',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('tools')
        .select('tool_name, tool_type, total_qty, available_qty, used_qty, status, storage_location, received_by, handover_date, return_date, notes')
        .order('tool_name')
      const rows = (data || []).map(r => ({
        'اسم العدة': r.tool_name || '',
        'النوع': r.tool_type || '',
        'الكمية الكلية': r.total_qty || '',
        'المتاح': r.available_qty || '',
        'المستخدم': r.used_qty || '',
        'الحالة': r.status || '',
        'موقع التخزين': r.storage_location || '',
        'تسلم بواسطة': r.received_by || '',
        'تاريخ التسليم': r.handover_date || '',
        'تاريخ الإرجاع': r.return_date || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'العدة'),
        filename: `تقرير-العدة-${today()}.xlsx`
      }
    }
  },

  inventory: {
    label: 'تقرير المخزون',
    emoji: '📦',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('inventory')
        .select('item_code, item_name, category, unit, current_qty, min_qty, received_qty, issued_qty, storage_location, supplier, notes')
        .order('item_name')
      const rows = (data || []).map(r => ({
        'كود الصنف': r.item_code || '',
        'اسم الصنف': r.item_name || '',
        'الفئة': r.category || '',
        'الوحدة': r.unit || '',
        'الكمية الحالية': r.current_qty || 0,
        'الحد الأدنى': r.min_qty || 0,
        'الوارد': r.received_qty || 0,
        'المنصرف': r.issued_qty || 0,
        'موقع التخزين': r.storage_location || '',
        'المورد': r.supplier || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'المخزون'),
        filename: `تقرير-المخزون-${today()}.xlsx`
      }
    }
  },

  approvals: {
    label: 'تقرير الاعتمادات',
    emoji: '✅',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('approvals')
        .select('approval_no, material_name, material_code, manufacturer, supplier, submitted_date, status, revision_no, notes')
        .order('approval_no')
      const rows = (data || []).map(r => ({
        'رقم الاعتماد': r.approval_no || '',
        'اسم المادة': r.material_name || '',
        'كود المادة': r.material_code || '',
        'المصنع': r.manufacturer || '',
        'المورد': r.supplier || '',
        'تاريخ التقديم': r.submitted_date || '',
        'الحالة': r.status || '',
        'رقم المراجعة': r.revision_no || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'الاعتمادات'),
        filename: `تقرير-الاعتمادات-${today()}.xlsx`
      }
    }
  },

  custody: {
    label: 'تقرير العهدة',
    emoji: '🗃️',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('custody')
        .select('custody_no, item_name, quantity, received_by, job_title, handover_date, status, return_date, notes')
        .order('custody_no')
      const rows = (data || []).map(r => ({
        'رقم العهدة': r.custody_no || '',
        'اسم الصنف': r.item_name || '',
        'الكمية': r.quantity || '',
        'تسلم بواسطة': r.received_by || '',
        'المسمى الوظيفي': r.job_title || '',
        'تاريخ التسليم': r.handover_date || '',
        'الحالة': r.status || '',
        'تاريخ الإرجاع': r.return_date || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'العهدة'),
        filename: `تقرير-العهدة-${today()}.xlsx`
      }
    }
  },

  documents: {
    label: 'تقرير المستندات',
    emoji: '📄',
    fetch: async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('documents')
        .select('document_name, document_type, document_no, issue_date, expiry_date, issuer, status, notes')
        .order('document_name')
      const rows = (data || []).map(r => ({
        'اسم المستند': r.document_name || '',
        'النوع': r.document_type || '',
        'رقم المستند': r.document_no || '',
        'تاريخ الإصدار': r.issue_date || '',
        'تاريخ الانتهاء': r.expiry_date || '',
        'الجهة المصدرة': r.issuer || '',
        'الحالة': r.status || '',
        'ملاحظات': r.notes || '',
      }))
      return {
        buffer: generateExcelBuffer(rows, 'المستندات'),
        filename: `تقرير-المستندات-${today()}.xlsx`
      }
    }
  },
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}
