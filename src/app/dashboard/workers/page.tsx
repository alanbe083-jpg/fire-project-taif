'use client'
import { useEffect, useState } from 'react'
import { supabase, Worker, WorkerInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, exportToPDF, getStatusColor, formatDate, isExpiringSoon, isExpired } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, FileText, Printer, AlertTriangle } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'نشط', label: 'نشط' }, { value: 'إجازة', label: 'إجازة' },
  { value: 'غائب', label: 'غائب' }, { value: 'منقول', label: 'منقول' }, { value: 'منتهي', label: 'منتهي' },
]

const EMPTY_FORM: WorkerInsert = {
  worker_name: '', iqama_no: '', job_title: '', mobile: '', nationality: '',
  iqama_expiry: '', work_permit_expiry: '', status: 'نشط', current_location: '', notes: ''
}

export default function WorkersPage() {
  const { profile, isAdmin } = useAuth()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Worker | null>(null)
  const [form, setForm] = useState<WorkerInsert>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Worker | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('workers').select('*').order('created_at', { ascending: false })
    setWorkers(data || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('workers').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة عامل', sectionName: 'العاملين', recordId: data.id, newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('workers').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'تعديل عامل', sectionName: 'العاملين', recordId: selected.id, oldData: selected, newData: form }); load(); setModal(null) }
    }
    setSaving(false)
  }

  async function del(w: Worker) {
    await supabase.from('workers').delete().eq('id', w.id)
    await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'حذف عامل', sectionName: 'العاملين', recordId: w.id, oldData: w })
    setDeleteConfirm(null); load()
  }

  function expiryBadge(dateStr?: string | null) {
    if (!dateStr) return <span className="text-slate-500">—</span>
    const expired = isExpired(dateStr)
    const soon = isExpiringSoon(dateStr)
    return (
      <span className={`flex items-center gap-1 text-xs ${expired ? 'text-red-400' : soon ? 'text-amber-400' : 'text-slate-400'}`}>
        {(expired || soon) && <AlertTriangle className="w-3 h-3" />}
        {formatDate(dateStr)}
      </span>
    )
  }

  const columns = [
    { key: 'worker_name', label: 'الاسم', sortable: true },
    { key: 'iqama_no', label: 'رقم الإقامة' },
    { key: 'job_title', label: 'المسمى الوظيفي' },
    { key: 'nationality', label: 'الجنسية' },
    { key: 'mobile', label: 'الجوال' },
    { key: 'iqama_expiry', label: 'انتهاء الإقامة', render: (w: Worker) => expiryBadge(w.iqama_expiry) },
    { key: 'work_permit_expiry', label: 'انتهاء رخصة العمل', render: (w: Worker) => expiryBadge(w.work_permit_expiry) },
    { key: 'status', label: 'الحالة', render: (w: Worker) => <span className={`badge ${getStatusColor(w.status || '')}`}>{w.status}</span> },
    { key: 'current_location', label: 'الموقع الحالي' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">العاملين</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportToExcel(workers.map(w => ({ 'الاسم': w.worker_name, 'رقم الإقامة': w.iqama_no, 'المسمى': w.job_title, 'الجنسية': w.nationality, 'الحالة': w.status })), 'تقرير_العاملين')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY_FORM); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة عامل</button>}
        </div>
      </div>

      <DataTable
        data={workers}
        columns={columns}
        searchKeys={['worker_name', 'iqama_no', 'job_title', 'nationality'] as any}
        filterKey="status"
        filterOptions={STATUS_OPTIONS}
        emptyMessage="لا يوجد عاملون مسجلون"
        actions={w => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(w); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(w); setForm({ ...w }); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(w)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة عامل جديد' : 'تعديل بيانات العامل'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { f: 'worker_name', l: 'الاسم الكامل' },
                { f: 'iqama_no', l: 'رقم الإقامة' },
                { f: 'job_title', l: 'المسمى الوظيفي' },
                { f: 'mobile', l: 'رقم الجوال' },
                { f: 'nationality', l: 'الجنسية' },
                { f: 'current_location', l: 'الموقع الحالي' },
                { f: 'iqama_expiry', l: 'تاريخ انتهاء الإقامة', t: 'date' },
                { f: 'work_permit_expiry', l: 'تاريخ انتهاء رخصة العمل', t: 'date' },
              ].map(({ f, l, t = 'text' }) => (
                <div key={f}>
                  <label className="label">{l}</label>
                  <input type={t} value={(form as any)[f] || ''} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label">الحالة</label>
                <select value={form.status || ''} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="input-field">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">ملاحظات</label>
                <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input-field" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setModal(null)} className="btn-secondary">إلغاء</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm mb-5">هل تريد حذف العامل "<span className="text-white">{deleteConfirm.worker_name}</span>"؟</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">إلغاء</button>
              <button onClick={() => del(deleteConfirm)} className="btn-danger"><Trash2 className="w-4 h-4" />حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
