'use client'
import { useEffect, useState } from 'react'
import { supabase, Custody, CustodyInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor, formatDate } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, Printer } from 'lucide-react'

const STATUS = ['في العهدة', 'مرتجع', 'مفقود', 'تالف']
const STATUS_OPTIONS = STATUS.map(s => ({ value: s, label: s }))
const EMPTY: CustodyInsert = { custody_no: '', item_name: '', quantity: 1, received_by: '', job_title: '', handover_date: '', status: 'في العهدة', return_date: '', notes: '' }

export default function CustodyPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<Custody[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Custody | null>(null)
  const [form, setForm] = useState<CustodyInsert>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Custody | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('custody').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('custody').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة عهدة', sectionName: 'العهدة', newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('custody').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { load(); setModal(null) }
    }
    setSaving(false)
  }

  async function del(c: Custody) {
    await supabase.from('custody').delete().eq('id', c.id)
    setDeleteConfirm(null); load()
  }

  const columns = [
    { key: 'custody_no', label: 'رقم العهدة', sortable: true },
    { key: 'item_name', label: 'اسم الصنف', sortable: true },
    { key: 'quantity', label: 'الكمية' },
    { key: 'received_by', label: 'تسلّم بواسطة' },
    { key: 'job_title', label: 'المسمى الوظيفي' },
    { key: 'handover_date', label: 'تاريخ التسليم', render: (c: Custody) => formatDate(c.handover_date) },
    { key: 'status', label: 'الحالة', render: (c: Custody) => <span className={`badge ${getStatusColor(c.status || '')}`}>{c.status}</span> },
    { key: 'return_date', label: 'تاريخ الإرجاع', render: (c: Custody) => formatDate(c.return_date) },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">العهدة</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToExcel(items.map(c => ({ 'رقم العهدة': c.custody_no, 'الصنف': c.item_name, 'الكمية': c.quantity, 'تسلّم بواسطة': c.received_by, 'الحالة': c.status })), 'تقرير_العهدة')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة عهدة</button>}
        </div>
      </div>

      <DataTable data={items} columns={columns} searchKeys={['custody_no', 'item_name', 'received_by'] as any} filterKey="status" filterOptions={STATUS_OPTIONS} emptyMessage="لا توجد عهدة مسجلة"
        actions={c => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(c); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(c); setForm({ ...c }); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(c)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة عهدة' : 'تعديل العهدة'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { f: 'custody_no', l: 'رقم العهدة' }, { f: 'item_name', l: 'اسم الصنف' },
                { f: 'quantity', l: 'الكمية', t: 'number' }, { f: 'received_by', l: 'تسلّم بواسطة' },
                { f: 'job_title', l: 'المسمى الوظيفي' },
                { f: 'handover_date', l: 'تاريخ التسليم', t: 'date' },
                { f: 'return_date', l: 'تاريخ الإرجاع', t: 'date' },
              ].map(({ f, l, t = 'text' }) => (
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
            <p className="text-slate-400 text-sm mb-5">حذف "<span className="text-white">{deleteConfirm.item_name}</span>"؟</p>
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
