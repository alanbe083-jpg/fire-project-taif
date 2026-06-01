'use client'
import { useEffect, useState } from 'react'
import { supabase, Approval, ApprovalInsert } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { logActivity, exportToExcel, getStatusColor, formatDate } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Plus, Pencil, Trash2, Eye, X, Save, FileSpreadsheet, Printer, Upload } from 'lucide-react'

const STATUS = ['تحت المراجعة', 'معتمد', 'مرفوض', 'يحتاج تعديل', 'غير مقدم', 'معتمد جزئياً', 'غير مطلوب (تنفيذ)', 'غير مطلوب كاعتماد']
const STATUS_OPTIONS = STATUS.map(s => ({ value: s, label: s }))
const EMPTY: ApprovalInsert = { approval_no: '', material_name: '', material_code: '', manufacturer: '', supplier: '', submitted_date: '', status: 'تحت المراجعة', revision_no: '', notes: '' } as any

const BUCKET = 'project-files'

function cleanFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.\-\u0600-\u06FF]/g, '_')
}

function extractApprovalNo(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, '')
  const match = base.match(/MAS-[A-Z]+-\d{2}-R\d{2}/i)
  if (match?.[0]) return match[0].toUpperCase()
  return base.trim()
}

function extractStoragePath(value?: string | null) {
  if (!value) return ''
  if (!value.startsWith('http')) return value

  try {
    const url = new URL(value)
    const marker = `/${BUCKET}/`
    const idx = url.pathname.indexOf(marker)
    if (idx >= 0) return decodeURIComponent(url.pathname.substring(idx + marker.length))
  } catch {
    // ignore bad URL and return original value
  }

  return value
}

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

  async function openFile(fileUrl?: string | null) {
    if (!fileUrl) {
      alert('لا يوجد ملف مربوط بهذا الاعتماد')
      return
    }

    const path = extractStoragePath(fileUrl)

    if (path.startsWith('http')) {
      window.open(path, '_blank')
      return
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10)

    if (error || !data?.signedUrl) {
      alert('تعذر فتح الملف: ' + (error?.message || 'رابط الملف غير صحيح'))
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  async function uploadFile(file: File) {
    if (!profile?.id) {
      alert('لا يمكن رفع الملف قبل تسجيل الدخول')
      return
    }

    setUploading(true)

    try {
      const approvalNo = extractApprovalNo(file.name)
      const safeName = cleanFileName(file.name)
      const path = `approvals/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        alert('فشل رفع الملف: ' + uploadError.message)
        return
      }

      // If user is editing an existing approval, update that approval directly.
      if (modal === 'edit' && selected?.id) {
        const updatePayload: any = {
          file_url: path,
          approval_no: (form as any).approval_no || approvalNo,
          status: 'معتمد',
          approval_status: 'معتمد',
          updated_by: profile.id,
        }

        const { error } = await supabase
          .from('approvals')
          .update(updatePayload)
          .eq('id', selected.id)

        if (error) {
          alert('تم رفع الملف، لكن فشل تحديث الاعتماد: ' + error.message)
          setForm(f => ({ ...(f as any), file_url: path, approval_no: (f as any).approval_no || approvalNo, status: 'معتمد' } as any))
          return
        }

        await logActivity({
          userId: profile.id,
          userName: profile.full_name,
          actionType: 'رفع ملف اعتماد',
          sectionName: 'الاعتمادات',
          oldData: selected,
          newData: updatePayload,
        })

        await load()
        setModal(null)
        alert(`تم رفع الملف وتحديث الاعتماد ${approvalNo} إلى معتمد`)
        return
      }

      // If user is adding/uploading, try to find a matching approval by approval_no from the file name.
      const { data: matches, error: findError } = await supabase
        .from('approvals')
        .select('*')
        .ilike('approval_no', approvalNo)
        .limit(1)

      if (findError) {
        alert('تم رفع الملف، لكن فشل البحث عن الاعتماد: ' + findError.message)
        setForm(f => ({ ...(f as any), file_url: path, approval_no: (f as any).approval_no || approvalNo, status: 'معتمد' } as any))
        return
      }

      const match = matches?.[0] as Approval | undefined

      if (match?.id) {
        const updatePayload: any = {
          file_url: path,
          status: 'معتمد',
          approval_status: 'معتمد',
          updated_by: profile.id,
        }

        const { error } = await supabase
          .from('approvals')
          .update(updatePayload)
          .eq('id', match.id)

        if (error) {
          alert('تم رفع الملف، لكن فشل تحديث الاعتماد: ' + error.message)
          setForm(f => ({ ...(f as any), file_url: path, approval_no: approvalNo, status: 'معتمد' } as any))
          return
        }

        await logActivity({
          userId: profile.id,
          userName: profile.full_name,
          actionType: 'مطابقة ملف اعتماد',
          sectionName: 'الاعتمادات',
          oldData: match,
          newData: { ...match, ...updatePayload },
        })

        await load()
        setModal(null)
        alert(`تم رفع الملف ومطابقته مع الاعتماد ${approvalNo} وتحديثه إلى معتمد`)
        return
      }

      // No match found: keep the uploaded file path in the form so the user can save a new approval manually.
      setForm(f => ({ ...(f as any), file_url: path, approval_no: (f as any).approval_no || approvalNo, status: 'معتمد' } as any))
      alert(`تم رفع الملف، لكن لم أجد اعتمادًا مطابقًا للرقم: ${approvalNo}. يمكنك إكمال البيانات ثم حفظه كاعتماد جديد.`)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!profile?.id) {
      alert('لا يمكن الحفظ قبل تسجيل الدخول')
      return
    }

    setSaving(true)

    try {
      if (modal === 'add') {
        const payload: any = { ...form, created_by: profile.id, updated_by: profile.id }
        const { data, error } = await supabase.from('approvals').insert(payload).select().single()
        if (error) {
          alert('فشل الحفظ: ' + error.message)
          return
        }

        await logActivity({ userId: profile.id, userName: profile.full_name, actionType: 'إضافة اعتماد', sectionName: 'الاعتمادات', newData: data })
        await load()
        setModal(null)
      } else if (modal === 'edit' && selected) {
        const payload: any = { ...form, updated_by: profile.id }
        const { error } = await supabase.from('approvals').update(payload).eq('id', selected.id)
        if (error) {
          alert('فشل التعديل: ' + error.message)
          return
        }

        await logActivity({ userId: profile.id, userName: profile.full_name, actionType: 'تعديل اعتماد', sectionName: 'الاعتمادات', oldData: selected, newData: payload })
        await load()
        setModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function del(item: Approval) {
    await supabase.from('approvals').delete().eq('id', item.id)
    setDeleteConfirm(null)
    load()
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
    {
      key: 'file_url',
      label: 'الملف',
      render: (a: Approval) => a.file_url
        ? <button type="button" onClick={() => openFile(a.file_url)} className="text-fire-400 hover:underline text-xs">عرض</button>
        : <span className="text-slate-600">—</span>,
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title">الاعتمادات</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportToExcel(items.map(a => ({ 'رقم الاعتماد': a.approval_no, 'المادة': a.material_name, 'الكود': a.material_code, 'المصنع': a.manufacturer, 'الحالة': a.status })), 'تقرير_الاعتمادات')} className="btn-secondary no-print"><FileSpreadsheet className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => { setForm(EMPTY); setSelected(null); setModal('add') }} className="btn-primary"><Plus className="w-4 h-4" />إضافة اعتماد</button>}
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
              <button onClick={() => { setSelected(item); setForm({ ...item } as any); setModal('edit') }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirm(item)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        )}
      />

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white font-semibold">{modal === 'add' ? 'إضافة اعتماد' : 'تعديل اعتماد'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { f: 'approval_no', l: 'رقم الاعتماد' },
                { f: 'material_name', l: 'اسم المادة' },
                { f: 'material_code', l: 'كود المادة' },
                { f: 'manufacturer', l: 'الشركة المصنعة' },
                { f: 'supplier', l: 'المورد' },
                { f: 'submitted_date', l: 'تاريخ التقديم', t: 'date' },
                { f: 'revision_no', l: 'رقم المراجعة' },
              ].map(({ f, l, t = 'text' }) => (
                <div key={f}>
                  <label className="label">{l}</label>
                  <input type={t} value={(form as any)[f] || ''} onChange={e => setForm(p => ({ ...(p as any), [f]: e.target.value } as any))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label">الحالة</label>
                <select value={(form as any).status || ''} onChange={e => setForm(p => ({ ...(p as any), status: e.target.value } as any))} className="input-field">
                  {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div className="col-span-2">
                  <label className="label">رفع ملف الاعتماد</label>
                  <label className="flex items-center gap-3 p-3 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-fire-500 transition-colors">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-400 text-sm">{uploading ? 'جاري الرفع والمطابقة...' : (form as any).file_url ? 'تم الرفع ✓' : 'اختر ملف PDF'}</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} disabled={uploading} />
                  </label>
                  <p className="text-slate-500 text-xs mt-2">سمِّ الملف بنفس رقم الاعتماد، مثل: MAS-MECH-01-R00.pdf ليتمت مطابقته تلقائيًا.</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="label">ملاحظات</label>
                <textarea value={(form as any).notes || ''} onChange={e => setForm(p => ({ ...(p as any), notes: e.target.value } as any))} className="input-field" rows={2} />
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
