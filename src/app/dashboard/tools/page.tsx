'use client'
import { useEffect, useState } from 'react'
import { supabase, Tool, ToolInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor, formatDate } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, Printer } from 'lucide-react'

const STATUS = ['متاح', 'مستخدم', 'في الصيانة', 'تالف']
const STATUS_OPTIONS = STATUS.map(s => ({ value: s, label: s }))
const EMPTY: ToolInsert = { tool_name: '', tool_type: '', total_qty: 0, available_qty: 0, used_qty: 0, status: 'متاح', storage_location: '', received_by: '', handover_date: '', return_date: '', notes: '' }

export default function ToolsPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<Tool[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Tool | null>(null)
  const [form, setForm] = useState<ToolInsert>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Tool | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('tools').select('*').order('tool_name')
    setItems(data || [])
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('tools').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة عدة', sectionName: 'العدة', newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('tools').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { load(); setModal(null) }
    }
    setSaving(false)
  }

  async function del(t: Tool) {
    await supabase.from('tools').delete().eq('id', t.id)
    setDeleteConfirm(null); load()
  }

  const columns = [
    { key: 'tool_name', label: 'اسم العدة', sortable: true },
    { key: 'tool_type', label: 'النوع' },
    { key: 'total_qty', label: 'الإجمالي' },
    { key: 'available_qty', label: 'المتاح', render: (t: Tool) => <span className="text-emerald-400 font-medium">{t.available_qty || 0}</span> },
    { key: 'used_qty', label: 'المستخدم', render: (t: Tool) => <span className="text-amber-400 font-medium">{t.used_qty || 0}</span> },
    { key: 'status', label: 'الحالة', render: (t: Tool) => <span className={`badge ${getStatusColor(t.status || '')}`}>{t.status}</span> },
    { key: 'storage_location', label: 'موقع التخزين' },
    { key: 'received_by', label: 'تسلّم بواسطة' },
    { key: 'handover_date', label: 'تاريخ التسليم', render: (t: Tool) => formatDate(t.handover_date) },
  ]

  const formFields = [
    { f: 'tool_name', l: 'اسم العدة' }, { f: 'tool_type', l: 'النوع' },
    { f: 'total_qty', l: 'الكمية الإجمالية', t: 'number' }, { f: 'available_qty', l: 'الكمية المتاحة', t: 'number' },
    { f: 'used_qty', l: 'الكمية المستخدمة', t: 'number' }, { f: 'storage_location', l: 'موقع التخزين' },
    { f: 'received_by', l: 'تسلّم بواسطة' }, { f: 'handover_date', l: 'تاريخ التسليم', t: 'date' },
    { f: 'return_date', l: 'تاريخ الإرجاع', t: 'date' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">العدة</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToExcel(items.map(t => ({ 'الاسم': t.tool_name, 'النوع': t.tool_type, 'الإجمالي': t.total_qty, 'المتاح': t.available_qty, 'المستخدم': t.used_qty, 'الحالة': t.status })), 'تقرير_العدة')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة عدة</button>}
        </div>
      </div>

      <DataTable data={items} columns={columns} searchKeys={['tool_name', 'tool_type', 'received_by'] as any} filterKey="status" filterOptions={STATUS_OPTIONS} emptyMessage="لا توجد عدة مسجلة"
        actions={t => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(t); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(t); setForm({ ...t }); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(t)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة عدة' : 'تعديل العدة'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {formFields.map(({ f, l, t = 'text' }) => (
                <div key={f}>
                  <label className="label">{l}</label>
                  <input type={t} value={(form as any)[f] || ''} onChange={e => setForm(p => ({ ...p, [f]: t === 'number' ? Number(e.target.value) : e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label">الحالة</label>
                <select value={form.status || ''} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="input-field">
                  {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">ملاحظات</label>
                <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setModal(null)} className="btn-secondary">إلغاء</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? '...' : <><Save className="w-4 h-4" />حفظ</>}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm mb-5">حذف "<span className="text-white">{deleteConfirm.tool_name}</span>"؟</p>
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
