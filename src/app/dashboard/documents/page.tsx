'use client'
import { useEffect, useState } from 'react'
import { supabase, Document, DocumentInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor, formatDate, isExpiringSoon, isExpired } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, Printer, Upload, AlertTriangle } from 'lucide-react'

const STATUS = ['ساري', 'منتهي', 'قيد التجديد', 'ملغي']
const STATUS_OPTIONS = STATUS.map(s => ({ value: s, label: s }))
const EMPTY: DocumentInsert = { document_name: '', document_type: '', document_no: '', issue_date: '', expiry_date: '', issuer: '', status: 'ساري', notes: '' }

export default function DocumentsPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<Document[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selected, setSelected] = useState<Document | null>(null)
  const [form, setForm] = useState<DocumentInsert>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function uploadFile(file: File) {
    try {
      setUploading(true)

      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'file'
      const safeName = file.name
        .replace(/\.[^/.]+$/, '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'document'

      const path = `documents/${Date.now()}_${safeName}.${extension}`
      const { data, error } = await supabase.storage
        .from('project-files')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })

      if (error) {
        alert('فشل رفع الملف: ' + error.message)
        return
      }

      setForm(f => ({ ...f, file_url: data.path }))
      alert('تم رفع الملف بنجاح. اضغط حفظ الآن لحفظ المستند.')
    } finally {
      setUploading(false)
    }
  }

  async function openFile(fileUrl?: string | null) {
    if (!fileUrl) {
      alert('لا يوجد ملف مربوط بهذا المستند')
      return
    }

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      window.open(fileUrl, '_blank')
      return
    }

    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(fileUrl, 60 * 10)

    if (error || !data?.signedUrl) {
      alert('تعذر فتح الملف: ' + (error?.message || 'رابط غير متاح'))
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  async function save() {
    setSaving(true)
    if (modal === 'add') {
      const { data, error } = await supabase.from('documents').insert({ ...form, created_by: profile!.id, updated_by: profile!.id }).select().single()
      if (!error) { await logActivity({ userId: profile!.id, userName: profile!.full_name, actionType: 'إضافة مستند', sectionName: 'الوثائق', newData: data }); load(); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase.from('documents').update({ ...form, updated_by: profile!.id }).eq('id', selected.id)
      if (!error) { load(); setModal(null) }
    }
    setSaving(false)
  }

  async function del(d: Document) {
    await supabase.from('documents').delete().eq('id', d.id)
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
    { key: 'document_name', label: 'اسم المستند', sortable: true },
    { key: 'document_type', label: 'النوع' },
    { key: 'document_no', label: 'رقم المستند' },
    { key: 'issuer', label: 'الجهة المصدرة' },
    { key: 'issue_date', label: 'تاريخ الإصدار', render: (d: Document) => formatDate(d.issue_date) },
    { key: 'expiry_date', label: 'تاريخ الانتهاء', render: (d: Document) => expiryCell(d.expiry_date) },
    { key: 'status', label: 'الحالة', render: (d: Document) => <span className={`badge ${getStatusColor(d.status || '')}`}>{d.status}</span> },
    { key: 'file_url', label: 'الملف', render: (d: Document) => d.file_url ? <button onClick={() => openFile(d.file_url)} className="text-fire-400 hover:underline text-xs">عرض</button> : <span className="text-slate-600">—</span> },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">الورقيات والمستندات</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToExcel(items.map(d => ({ 'الاسم': d.document_name, 'النوع': d.document_type, 'الرقم': d.document_no, 'الانتهاء': d.expiry_date, 'الحالة': d.status })), 'تقرير_المستندات')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة مستند</button>}
        </div>
      </div>

      <DataTable data={items} columns={columns} searchKeys={['document_name', 'document_type', 'document_no', 'issuer'] as any} filterKey="status" filterOptions={STATUS_OPTIONS} emptyMessage="لا توجد مستندات"
        actions={d => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(d); setModal('view') }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
            {isAdmin && <>
              <button onClick={() => { setSelected(d); setForm({ ...d }); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(d)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة مستند' : 'تعديل مستند'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { f: 'document_name', l: 'اسم المستند' }, { f: 'document_type', l: 'نوع المستند' },
                { f: 'document_no', l: 'رقم المستند' }, { f: 'issuer', l: 'الجهة المصدرة' },
                { f: 'issue_date', l: 'تاريخ الإصدار', t: 'date' }, { f: 'expiry_date', l: 'تاريخ الانتهاء', t: 'date' },
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
                <div>
                  <label className="label">رفع ملف</label>
                  <label className="flex items-center gap-2 p-3 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-fire-500 transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400 text-sm">{uploading ? 'جاري الرفع...' : form.file_url ? 'تم رفع الملف ✓' : 'اختر ملف'}</span>
                    <input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} disabled={uploading} />
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
              <button onClick={save} disabled={saving || uploading} className="btn-primary">{saving ? '...' : <><Save className="w-4 h-4" />حفظ</>}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm mb-5">حذف "<span className="text-white">{deleteConfirm.document_name}</span>"؟</p>
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
