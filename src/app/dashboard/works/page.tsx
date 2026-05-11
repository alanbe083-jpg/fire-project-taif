'use client'
import { useEffect, useState } from 'react'
import { supabase, Work, WorkInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, exportToPDF, getStatusColor, formatDate } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, Download, Printer, X, Save, FileSpreadsheet, FileText } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'لم يبدأ', label: 'لم يبدأ' },
  { value: 'جاري التنفيذ', label: 'جاري التنفيذ' },
  { value: 'منجز', label: 'منجز' },
  { value: 'متوقف', label: 'متوقف' },
]

const EMPTY_FORM: WorkInsert = {
  item_no: '', description: '', location: '', quantity: 0, unit: '', progress: 0,
  status: 'لم يبدأ', start_date: '', end_date: '', responsible: '', notes: ''
}

export default function WorksPage() {
  const { profile, isAdmin } = useAuth()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Work | null>(null)
  const [form, setForm] = useState<WorkInsert>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Work | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('works').select('*').order('created_at', { ascending: false })
    setWorks(data || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY_FORM); setModal('add') }
  function openEdit(w: Work) { setSelected(w); setForm({ ...w }); setModal('edit') }
  function openView(w: Work) { setSelected(w); setModal('view') }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('works').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) {
        await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة عمل جديد', sectionName: 'الأعمال', recordId: data.id, newData: data })
        load(); setModal(null)
      }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('works').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) {
        await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'تعديل عمل', sectionName: 'الأعمال', recordId: selected.id, oldData: selected, newData: form })
        load(); setModal(null)
      }
    }
    setSaving(false)
  }

  async function deleteWork(w: Work) {
    await supabase.from('works').delete().eq('id', w.id)
    await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'حذف عمل', sectionName: 'الأعمال', recordId: w.id, oldData: w })
    setDeleteConfirm(null); load()
  }

  const columns = [
    { key: 'item_no', label: 'رقم البند', sortable: true },
    { key: 'description', label: 'الوصف', sortable: true },
    { key: 'location', label: 'الموقع' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'unit', label: 'الوحدة' },
    {
      key: 'progress', label: 'نسبة الإنجاز',
      render: (w: Work) => (
        <div className="flex items-center gap-2 min-w-24">
          <div className="progress-bar flex-1">
            <div className="progress-fill bg-fire-500" style={{ width: `${w.progress || 0}%` }} />
          </div>
          <span className="text-xs text-slate-400">{w.progress || 0}%</span>
        </div>
      )
    },
    {
      key: 'status', label: 'الحالة',
      render: (w: Work) => <span className={`badge ${getStatusColor(w.status || '')}`}>{w.status}</span>
    },
    { key: 'responsible', label: 'المسؤول' },
    { key: 'start_date', label: 'بداية', render: (w: Work) => formatDate(w.start_date) },
    { key: 'end_date', label: 'نهاية', render: (w: Work) => formatDate(w.end_date) },
  ]

  function doExportExcel() {
    exportToExcel(works.map(w => ({
      'رقم البند': w.item_no, 'الوصف': w.description, 'الموقع': w.location,
      'الكمية': w.quantity, 'الوحدة': w.unit, 'الإنجاز %': w.progress,
      'الحالة': w.status, 'المسؤول': w.responsible,
    })), 'تقرير_الأعمال', 'الأعمال')
  }

  function doExportPDF() {
    exportToPDF('تقرير الأعمال — مشروع مكافحة الحريق — الطائف',
      ['رقم البند', 'الوصف', 'الموقع', 'الكمية', 'الوحدة', 'الإنجاز', 'الحالة', 'المسؤول'],
      works.map(w => [w.item_no || '', w.description || '', w.location || '', String(w.quantity || ''), w.unit || '', `${w.progress || 0}%`, w.status || '', w.responsible || '']),
      'تقرير_الأعمال')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">الأعمال</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={doExportExcel} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span></button>
          <button onClick={doExportPDF} className="btn-secondary no-print"><FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />إضافة عمل</button>}
        </div>
      </div>

      <DataTable
        data={works}
        columns={columns}
        searchKeys={['item_no', 'description', 'location', 'responsible'] as any}
        filterKey="status"
        filterOptions={STATUS_OPTIONS}
        emptyMessage="لا توجد أعمال مسجلة"
        actions={w => (
          <div className="flex items-center gap-1">
            <button onClick={() => openView(w)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => openEdit(w)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(w)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة عمل جديد' : 'تعديل العمل'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { field: 'item_no', label: 'رقم البند' },
                { field: 'description', label: 'الوصف' },
                { field: 'location', label: 'الموقع' },
                { field: 'quantity', label: 'الكمية', type: 'number' },
                { field: 'unit', label: 'الوحدة' },
                { field: 'responsible', label: 'المسؤول' },
                { field: 'start_date', label: 'تاريخ البداية', type: 'date' },
                { field: 'end_date', label: 'تاريخ النهاية', type: 'date' },
              ].map(({ field, label, type = 'text' }) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <input type={type} value={(form as any)[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label">نسبة الإنجاز %</label>
                <input type="number" min="0" max="100" value={form.progress || 0} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="label">الحالة</label>
                <select value={form.status || ''} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className="input-field">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">ملاحظات</label>
                <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setModal(null)} className="btn-secondary">إلغاء</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">تفاصيل العمل</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                ['رقم البند', selected.item_no],
                ['الوصف', selected.description],
                ['الموقع', selected.location],
                ['الكمية', selected.quantity],
                ['الوحدة', selected.unit],
                ['نسبة الإنجاز', `${selected.progress}%`],
                ['الحالة', selected.status],
                ['المسؤول', selected.responsible],
                ['تاريخ البداية', formatDate(selected.start_date)],
                ['تاريخ النهاية', formatDate(selected.end_date)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-slate-500 text-xs mb-1">{label}</p>
                  <p className="text-white text-sm">{value || '—'}</p>
                </div>
              ))}
              {selected.notes && (
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs mb-1">ملاحظات</p>
                  <p className="text-white text-sm">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm mb-5">هل تريد حذف العمل "<span className="text-white">{deleteConfirm.description}</span>"؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">إلغاء</button>
              <button onClick={() => deleteWork(deleteConfirm)} className="btn-danger"><Trash2 className="w-4 h-4" />حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
