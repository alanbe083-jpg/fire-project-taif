'use client'
import { useEffect, useState } from 'react'
import { supabase, Inventory, InventoryInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, AlertTriangle, ArrowUpDown, FileSpreadsheet, Printer } from 'lucide-react'

const EMPTY: InventoryInsert = {
  item_code: '', item_name: '', category: '', unit: '', current_qty: 0,
  min_qty: 0, received_qty: 0, issued_qty: 0, storage_location: '', supplier: '', notes: ''
}

export default function InventoryPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<Inventory[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | 'movement' | null>(null)
  const [selected, setSelected] = useState<Inventory | null>(null)
  const [form, setForm] = useState<InventoryInsert>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Inventory | null>(null)
  const [movement, setMovement] = useState({ type: 'وارد', qty: 0, notes: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('inventory').select('*').order('item_name')
    setItems(data || [])
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('inventory').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة مادة للمخزون', sectionName: 'المخزون', newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('inventory').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'تعديل مادة مخزون', sectionName: 'المخزون', oldData: selected, newData: form }); load(); setModal(null) }
    }
    setSaving(false)
  }

  async function addMovement() {
    if (!selected || !movement.qty) return
    setSaving(true)
    await supabase.from('inventory_movements').insert({
      inventory_id: selected.id, movement_type: movement.type as any,
      quantity: movement.qty, notes: movement.notes, created_by: profile!.id
    })
    // Update qty
    const qtyDelta = movement.type === 'وارد' || movement.type === 'مرتجع' ? movement.qty : -movement.qty
    const newQty = Math.max(0, (selected.current_qty || 0) + qtyDelta)
    await supabase.from('inventory').update({
      current_qty: newQty,
      received_qty: movement.type === 'وارد' ? (selected.received_qty || 0) + movement.qty : selected.received_qty,
      issued_qty: movement.type === 'منصرف' ? (selected.issued_qty || 0) + movement.qty : selected.issued_qty,
    }).eq('id', selected.id)
    await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: `حركة مخزون: ${movement.type}`, sectionName: 'المخزون' })
    load(); setModal(null); setSaving(false)
    setMovement({ type: 'وارد', qty: 0, notes: '' })
  }

  async function del(item: Inventory) {
    await supabase.from('inventory').delete().eq('id', item.id)
    setDeleteConfirm(null); load()
  }

  const columns = [
    { key: 'item_code', label: 'الكود', sortable: true },
    { key: 'item_name', label: 'اسم المادة', sortable: true },
    { key: 'category', label: 'التصنيف' },
    { key: 'unit', label: 'الوحدة' },
    {
      key: 'current_qty', label: 'الكمية الحالية',
      render: (i: Inventory) => (
        <span className={`font-semibold ${(i.current_qty || 0) < (i.min_qty || 0) ? 'text-red-400' : 'text-emerald-400'}`}>
          {i.current_qty || 0}
        </span>
      )
    },
    { key: 'min_qty', label: 'الحد الأدنى' },
    {
      key: 'alert', label: '',
      render: (i: Inventory) => (i.current_qty || 0) < (i.min_qty || 0)
        ? <span className="badge bg-red-500/20 text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />منخفض</span>
        : null
    },
    { key: 'storage_location', label: 'موقع التخزين' },
    { key: 'supplier', label: 'المورد' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">المخزون</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportToExcel(items.map(i => ({ 'الكود': i.item_code, 'الاسم': i.item_name, 'التصنيف': i.category, 'الكمية': i.current_qty, 'الوحدة': i.unit })), 'تقرير_المخزون')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة مادة</button>}
        </div>
      </div>

      {/* Low stock alert */}
      {items.some(i => (i.current_qty || 0) < (i.min_qty || 0)) && (
        <div className="alert-banner bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>تحذير: بعض المواد أقل من الحد الأدنى للمخزون</span>
        </div>
      )}

      <DataTable
        data={items}
        columns={columns}
        searchKeys={['item_code', 'item_name', 'category', 'supplier'] as any}
        emptyMessage="لا توجد مواد في المخزون"
        actions={item => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(item); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(item); setMovement({ type: 'وارد', qty: 0, notes: '' }); setModal('movement') }}
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg" title="إضافة حركة">
                <ArrowUpDown className="w-4 h-4" />
              </button>
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
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة مادة للمخزون' : 'تعديل مادة'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { f: 'item_code', l: 'كود المادة' }, { f: 'item_name', l: 'اسم المادة' },
                { f: 'category', l: 'التصنيف' }, { f: 'unit', l: 'الوحدة' },
                { f: 'current_qty', l: 'الكمية الحالية', t: 'number' }, { f: 'min_qty', l: 'الحد الأدنى', t: 'number' },
                { f: 'received_qty', l: 'الكمية الواردة', t: 'number' }, { f: 'issued_qty', l: 'الكمية المنصرفة', t: 'number' },
                { f: 'storage_location', l: 'موقع التخزين' }, { f: 'supplier', l: 'المورد' },
              ].map(({ f, l, t = 'text' }) => (
                <div key={f}>
                  <label className="label">{l}</label>
                  <input type={t} value={(form as any)[f] || ''} onChange={e => setForm(p => ({ ...p, [f]: t === 'number' ? Number(e.target.value) : e.target.value }))} className="input-field" />
                </div>
              ))}
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

      {/* Movement Modal */}
      {modal === 'movement' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">إضافة حركة مخزون</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-400 text-sm mb-4">المادة: <span className="text-white">{selected.item_name}</span> — الكمية الحالية: <span className="text-fire-400 font-semibold">{selected.current_qty}</span></p>
            <div className="space-y-4">
              <div>
                <label className="label">نوع الحركة</label>
                <select value={movement.type} onChange={e => setMovement(m => ({ ...m, type: e.target.value }))} className="input-field">
                  {['وارد', 'منصرف', 'مرتجع', 'تالف'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">الكمية</label>
                <input type="number" min="0" value={movement.qty} onChange={e => setMovement(m => ({ ...m, qty: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <textarea value={movement.notes} onChange={e => setMovement(m => ({ ...m, notes: e.target.value }))} className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary">إلغاء</button>
              <button onClick={addMovement} disabled={saving || !movement.qty} className="btn-primary">
                {saving ? '...' : <><Save className="w-4 h-4" />تسجيل الحركة</>}
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
            <p className="text-slate-400 text-sm mb-5">هل تريد حذف "<span className="text-white">{deleteConfirm.item_name}</span>"؟</p>
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
