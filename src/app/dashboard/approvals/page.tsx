'use client'
import { useEffect, useState } from 'react'
import { supabase, Approval, ApprovalInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor, formatDate } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, Printer, Upload } from 'lucide-react'

const STATUS = ['تحت المراجعة', 'معتمد', 'مرفوض', 'يحتاج تعديل']
const STATUS_OPTIONS = STATUS.map(s => ({ value: s, label: s }))
const EMPTY: ApprovalInsert = { approval_no: '', material_name: '', material_code: '', manufacturer: '', supplier: '', submitted_date: '', status: 'تحت المراجعة', revision_no: '', notes: '' }

export default function ApprovalsPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<Approval[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Approval | null>(null)
  const [form, setForm] = useState<ApprovalInsert>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Approval | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('approvals').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function uploadFile(file: File) {
    setUploading(true)
    const path = `approvals/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('project-files').upload(path, file)
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(data.path)
      setForm(f => ({ ...f, file_url: publicUrl }))
    }
    setUploading(false)
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('approvals').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة اعتماد', sectionName: 'الاعتمادات', newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('approvals').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'تعديل اعتماد', sectionName: 'الاعتمادات', oldData: selected, newData: form }); load(); setModal(null) }
    }
    setSaving(false)
  }

  async function del(item: Approval) {
    await supabase.from('approvals').delete().eq('id', item.id)
    setDeleteConfirm(null); load()
  }

  const columns = [
    { key: 'approval_no', label: 'رقم الاعتماد', sortable: true },
    { key: 'material_name', label: 'اسم المادة', sortable: true },
    { key: 'material_code', label: 'الكود' },
    { key: 'manufacturer', label: 'الشركة المصنعة' },
    { key: 'supplier', label: 'المورد' },
    { key: 'submitted_date', label: 'تاريخ التقديم', render: (a: Approval) => formatDate(a.submitted_date) },
    { key: 'revision_no', label: 'رقم المراجعة' },
    { key: 'status', label: 'الحالة', render: (a: Approval) => <span className={`badge ${getStatusColor(a.status || '')}`}>{a.status}</span> },
    { key: 'file_url', label: 'الملف', render: (a: Approval) => a.file_url ? <a href={a.file_url} target="_blank" className="text-fire-400 hover:underline text-xs">عرض</a> : <span className="text-slate-600">—</span> },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">الاعتمادات</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportToExcel(items.map(a => ({ 'رقم الاعتماد': a.approval_no, 'المادة': a.material_name, 'الكود': a.material_code, 'المصنع': a.manufacturer, 'الحالة': a.status })), 'تقرير_الاعتمادات')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة اعتماد</button>}
        </div>
      </div>

      <DataTable
        data={items}
        columns={columns}
        searchKeys={['material_name', 'material_code', 'manufacturer', 'supplier', 'approval_no'] as any}
        filterKey="status"
        filterOptions={STATUS_OPTIONS}
        emptyMessage="لا توجد اعتمادات مسجلة"
        actions={item => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(item); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(item); setForm({ ...item }); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(item)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة اعتماد' : 'تعديل اعتماد'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { f: 'approval_no', l: 'رقم الاعتماد' }, { f: 'material_name', l: 'اسم المادة' },
                { f: 'material_code', l: 'كود المادة' }, { f: 'manufacturer', l: 'الشركة المصنعة' },
                { f: 'supplier', l: 'المورد' }, { f: 'submitted_date', l: 'تاريخ التقديم', t: 'date' },
                { f: 'revision_no', l: 'رقم المراجعة' },
              ].map(({ f, l, t = 'text' }) => (
                <div key={f}>
                  <label className="label">{l}</label>
                  <input type={t} value={(form as any)[f] || ''} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label">الحالة</label>
                <select value={form.status || ''} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="input-field">
                  {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div className="col-span-2">
                  <label className="label">رفع ملف الاعتماد</label>
                  <label className="flex items-center gap-3 p-3 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-fire-500 transition-colors">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-400 text-sm">{uploading ? 'جاري الرفع...' : form.file_url ? 'تم الرفع ✓' : 'اختر ملف PDF'}</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} disabled={uploading} />
                  </label>
                </div>
              )}
              <div className="col-span-2">
                <label className="label">ملاحظات</label>
                <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setModal(null)} className="btn-secondary">إلغاء</button>
              <button onClick={save} disabled={saving || uploading} className="btn-primary">
                {saving ? '...' : <><Save className="w-4 h-4" />حفظ</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm mb-5">هل تريد حذف اعتماد "<span className="text-white">{deleteConfirm.material_name}</span>"؟</p>
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
