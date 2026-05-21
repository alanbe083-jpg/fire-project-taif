'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToExcel, exportToPDF, getStatusColor, formatDate } from '@/lib/utils'
import { BarChart3, FileSpreadsheet, FileText, Printer } from 'lucide-react'

type ReportType =
  | 'works'
  | 'workers'
  | 'inventory'
  | 'approvals'
  | 'custody'
  | 'vehicles'
  | 'tools'

const REPORTS: { key: ReportType; label: string; color: string }[] = [
  { key: 'works', label: 'تقرير الأعمال', color: 'text-blue-400' },
  { key: 'workers', label: 'تقرير العاملين', color: 'text-emerald-400' },
  { key: 'inventory', label: 'تقرير المخزون', color: 'text-teal-400' },
  { key: 'approvals', label: 'تقرير الاعتمادات', color: 'text-fire-400' },
  { key: 'tools', label: 'تقرير العدة', color: 'text-orange-400' },
  { key: 'custody', label: 'تقرير العهدة', color: 'text-indigo-400' },
  { key: 'vehicles', label: 'تقرير العربات', color: 'text-amber-400' },
]

const TABLES_MAP: Record<ReportType, string> = {
  works: 'works',
  workers: 'workers',
  inventory: 'inventory',
  approvals: 'approvals',
  custody: 'custody',
  vehicles: 'vehicles',
  tools: 'tools',
}

export default function ReportsPage() {
  const [active, setActive] = useState<ReportType>('works')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadReport()
  }, [active, statusFilter, dateFrom, dateTo])

  async function loadReport() {
    setLoading(true)

    let q: any = supabase.from(TABLES_MAP[active]).select('*')

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter)
    }

    if (dateFrom) {
      q = q.gte('created_at', dateFrom)
    }

    if (dateTo) {
      q = q.lte('created_at', dateTo)
    }

    const { data, error } = await q.order('created_at', { ascending: false })

    if (error) {
      console.error('Report load error:', error)
      setData([])
    } else {
      setData(data || [])
    }

    setLoading(false)
  }

  const currentReport = REPORTS.find((r) => r.key === active)!

  const columnsMap: Record<ReportType, { key: string; label: string }[]> = {
    works: [
      { key: 'item_no', label: 'رقم البند' },
      { key: 'description', label: 'الوصف' },
      { key: 'location', label: 'الموقع' },
      { key: 'progress', label: 'الإنجاز %' },
      { key: 'status', label: 'الحالة' },
      { key: 'responsible', label: 'المسؤول' },
    ],

    workers: [
      { key: 'worker_name', label: 'الاسم' },
      { key: 'iqama_no', label: 'رقم الإقامة' },
      { key: 'job_title', label: 'المسمى' },
      { key: 'nationality', label: 'الجنسية' },
      { key: 'status', label: 'الحالة' },
      { key: 'iqama_expiry', label: 'انتهاء الإقامة' },
    ],

    inventory: [
      { key: 'item_code', label: 'الكود' },
      { key: 'item_name', label: 'المادة' },
      { key: 'category', label: 'التصنيف' },
      { key: 'current_qty', label: 'الكمية' },
      { key: 'min_qty', label: 'الحد الأدنى' },
      { key: 'storage_location', label: 'التخزين' },
    ],

    approvals: [
      { key: 'approval_no', label: 'رقم الاعتماد' },
      { key: 'material_name', label: 'المادة' },
      { key: 'manufacturer', label: 'المصنع' },
      { key: 'supplier', label: 'المورد' },
      { key: 'submitted_date', label: 'تاريخ التقديم' },
      { key: 'status', label: 'الحالة' },
      { key: 'revision_no', label: 'المراجعة' },
    ],
tools: [
  { key: 'tool_name', label: 'اسم العدة' },
  { key: 'tool_type', label: 'نوع العدة' },
  { key: 'total_qty', label: 'الإجمالي' },
  { key: 'used_qty', label: 'المستخدم' },
  { key: 'available_qty', label: 'المتاح' },
  { key: 'status', label: 'الحالة' },
  { key: 'storage_location', label: 'موقع التخزين' },
  { key: 'received_by', label: 'المستلم' },
],

    custody: [
      { key: 'custody_no', label: 'رقم العهدة' },
      { key: 'item_name', label: 'الصنف' },
      { key: 'quantity', label: 'الكمية' },
      { key: 'received_by', label: 'تسلّم بواسطة' },
      { key: 'handover_date', label: 'تاريخ التسليم' },
      { key: 'status', label: 'الحالة' },
    ],

    vehicles: [
      { key: 'vehicle_no', label: 'رقم العربة' },
      { key: 'vehicle_type', label: 'النوع' },
      { key: 'plate_no', label: 'اللوحة' },
      { key: 'driver_name', label: 'السائق' },
      { key: 'status', label: 'الحالة' },
      { key: 'registration_expiry', label: 'انتهاء الاستمارة' },
    ],
  }

  const cols = columnsMap[active]

  function getCellValue(row: any, key: string) {
    if (key === 'status') return row[key] || '—'
    if (key.includes('date') || key.includes('expiry')) return formatDate(row[key])
    if (key === 'progress') return `${row[key] || 0}%`
    return String(row[key] ?? '—')
  }

  function doExportExcel() {
    const rows = data.map((row) =>
      Object.fromEntries(cols.map((c) => [c.label, getCellValue(row, c.key)]))
    )

    exportToExcel(rows, currentReport.label)
  }

  function doExportPDF() {
    /*
      مهم:
      PDF libraries غالبًا تطلع الجدول Left-To-Right.
      لذلك نعكس الأعمدة هنا فقط للـ PDF، حتى تظهر في الملف من اليمين لليسار.
      العرض داخل الموقع يبقى طبيعي RTL.
    */
   function doExportPDF() {
  exportToPDF(
    `${currentReport.label} — مشروع مكافحة الحريق — الطائف`,
    cols.map((c) => c.label),
    data.map((row) => cols.map((c) => getCellValue(row, c.key))),
    currentReport.label
  )
}

  function doExportPDF() {
  exportToPDF(
    `${currentReport.label} — مشروع مكافحة الحريق — الطائف`,
    cols.map((c) => c.label),
    data.map((row) => cols.map((c) => getCellValue(row, c.key))),
    currentReport.label
  )
}

  return (
    <div dir="rtl" className="space-y-5 animate-fade-in print-page">
      <style jsx global>{`
        @media print {
          html,
          body {
            direction: rtl !important;
            text-align: right !important;
            font-family: Arial, Tahoma, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-page {
            direction: rtl !important;
            text-align: right !important;
          }

          .print-table {
            direction: rtl !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .print-table thead,
          .print-table tbody,
          .print-table tr {
            direction: rtl !important;
          }

          .print-table th,
          .print-table td {
            direction: rtl !important;
            text-align: right !important;
            unicode-bidi: plaintext !important;
            padding: 8px !important;
            font-size: 12px !important;
            white-space: normal !important;
          }

          .print-table th {
            background: #ea4a1a !important;
            color: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4 landscape;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="section-header">
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-fire-400" />
          التقارير
        </h1>

        <div className="flex items-center gap-2 no-print">
          <button onClick={doExportExcel} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

          <button onClick={doExportPDF} className="btn-secondary">
            <FileText className="w-4 h-4" />
            PDF
          </button>

          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 no-print">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => {
              setActive(r.key)
              setStatusFilter('all')
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              active === r.key
                ? 'bg-fire-500/15 border-fire-500/40 text-fire-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-4 items-end no-print">
        <div>
          <label className="label text-xs">فلتر الحالة</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-sm w-44"
          >
            <option value="all">الكل</option>

            {active === 'works' &&
              ['لم يبدأ', 'جاري التنفيذ', 'منجز', 'متوقف'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}

            {active === 'workers' &&
              ['نشط', 'إجازة', 'غائب', 'منقول', 'منتهي'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}

            {active === 'approvals' &&
              ['تحت المراجعة', 'معتمد', 'مرفوض', 'يحتاج تعديل', 'Code A', 'Code B', 'Code C'].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}

            {active === 'custody' &&
              ['في العهدة', 'مرتجع', 'مفقود', 'تالف'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}

            {active === 'vehicles' &&
              ['نشط', 'في الصيانة', 'متوقف', 'مسحوب'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}

            {active === 'tools' &&
              ['متاح', 'مستخدم', 'تالف', 'مفقود'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="label text-xs">من تاريخ</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field text-sm w-44"
          />
        </div>

        <div>
          <label className="label text-xs">إلى تاريخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field text-sm w-44"
          />
        </div>

        <div className="text-slate-500 text-sm pt-6">
          إجمالي السجلات:{' '}
          <span className="text-white font-semibold">{data.length}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-white font-semibold">{currentReport.label}</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table dir="rtl" className="w-full text-sm print-table">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-right font-medium">#</th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className="px-4 py-3 text-right font-medium whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="text-center py-10 text-slate-500"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="text-center py-10 text-slate-500"
                  >
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id || i} className="table-row">
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {i + 1}
                    </td>

                    {cols.map((c) => (
                      <td
                        key={c.key}
                        className="px-4 py-3 text-slate-300 whitespace-nowrap"
                      >
                        {c.key === 'status' ? (
                          <span className={`badge ${getStatusColor(row[c.key] || '')}`}>
                            {row[c.key] || '—'}
                          </span>
                        ) : (
                          getCellValue(row, c.key)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}