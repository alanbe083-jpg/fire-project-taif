'use client'
import { useEffect, useState } from 'react'
import { supabase, Vehicle, VehicleInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor, formatDate, isExpiringSoon, isExpired } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, Printer, AlertTriangle } from 'lucide-react'

const STATUS = ['نشط', 'في الصيانة', 'متوقف', 'مسحوب']
const STATUS_OPTIONS = STATUS.map(s => ({ value: s, label: s }))
const EMPTY: VehicleInsert = { vehicle_no: '', vehicle_type: '', plate_no: '', driver_name: '', status: 'نشط', last_maintenance: '', registration_expiry: '', insurance_expiry: '', notes: '' }

export default function VehiclesPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<Vehicle[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<VehicleInsert>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Vehicle | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('vehicles').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة عربة', sectionName: 'العربات', newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('vehicles').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'تعديل عربة', sectionName: 'العربات', oldData: selected, newData: form }); load(); setModal(null) }
    }
    setSaving(false)
  }

  async function del(v: Vehicle) {
    await supabase.from('vehicles').delete().eq('id', v.id)
    setDeleteConfirm(null); load()
  }

  function expiryCell(dateStr?: string | null) {
    if (!dateStr) return <span className="text-slate-500">—</span>
    const expired = isExpired(dateStr), soon = isExpiringSoon(dateStr)
    return (
      <span className={`flex items-center gap-1 text-xs ${expired ? 'text-red-400' : soon ? 'text-amber-400' : 'text-slate-400'}`}>
        {(expired || soon) && <AlertTriangle className="w-3 h-3" />}
        {formatDate(dateStr)}
      </span>
    )
  }

  const columns = [
    { key: 'vehicle_no', label: 'رقم العربة', sortable: true },
    { key: 'vehicle_type', label: 'النوع', sortable: true },
    { key: 'plate_no', label: 'رقم اللوحة' },
    { key: 'driver_name', label: 'السائق' },
    { key: 'status', label: 'الحالة', render: (v: Vehicle) => <span className={`badge ${getStatusColor(v.status || '')}`}>{v.status}</span> },
    { key: 'last_maintenance', label: 'آخر صيانة', render: (v: Vehicle) => formatDate(v.last_maintenance) },
    { key: 'registration_expiry', label: 'انتهاء الاستمارة', render: (v: Vehicle) => expiryCell(v.registration_expiry) },
    { key: 'insurance_expiry', label: 'انتهاء التأمين', render: (v: Vehicle) => expiryCell(v.insurance_expiry) },
  ]

  const fields = [
    { f: 'vehicle_no', l: 'رقم العربة' }, { f: 'vehicle_type', l: 'النوع' },
    { f: 'plate_no', l: 'رقم اللوحة' }, { f: 'driver_name', l: 'اسم السائق' },
    { f: 'last_maintenance', l: 'تاريخ آخر صيانة', t: 'date' },
    { f: 'registration_expiry', l: 'تاريخ انتهاء الاستمارة', t: 'date' },
    { f: 'insurance_expiry', l: 'تاريخ انتهاء التأمين', t: 'date' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">العربات</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToExcel(items.map(v => ({ 'رقم العربة': v.vehicle_no, 'النوع': v.vehicle_type, 'اللوحة': v.plate_no, 'السائق': v.driver_name, 'الحالة': v.status })), 'تقرير_العربات')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة عربة</button>}
        </div>
      </div>

      <DataTable data={items} columns={columns} searchKeys={['vehicle_no', 'vehicle_type', 'plate_no', 'driver_name'] as any} filterKey="status" filterOptions={STATUS_OPTIONS} emptyMessage="لا توجد عربات مسجلة"
        actions={v => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(v); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(v); setForm({ ...v }); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(v)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة عربة' : 'تعديل العربة'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {fields.map(({ f, l, t = 'text' }) => (
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
            <p className="text-slate-400 text-sm mb-5">حذف العربة "<span className="text-white">{deleteConfirm.vehicle_no}</span>"؟</p>
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
