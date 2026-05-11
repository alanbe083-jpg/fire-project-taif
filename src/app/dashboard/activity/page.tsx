'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Search } from 'lucide-react'

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE = 20

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)
    setLogs(data || [])
    setLoading(false)
  }

  const filtered = logs.filter(l =>
    !search || l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action_type?.includes(search) || l.section_name?.includes(search)
  )
  const pages = Math.ceil(filtered.length / PAGE)
  const paginated = filtered.slice((page - 1) * PAGE, page * PAGE)

  const actionColor = (action: string) => {
    if (action.includes('إضافة')) return 'text-emerald-400 bg-emerald-500/10'
    if (action.includes('تعديل')) return 'text-blue-400 bg-blue-500/10'
    if (action.includes('حذف')) return 'text-red-400 bg-red-500/10'
    return 'text-slate-400 bg-slate-500/10'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <h1 className="page-title flex items-center gap-2"><Activity className="w-5 h-5 text-fire-400" />سجل العمليات</h1>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="input-field pr-10 max-w-md" placeholder="بحث في السجل..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-right font-medium">التاريخ والوقت</th>
                <th className="px-4 py-3 text-right font-medium">المستخدم</th>
                <th className="px-4 py-3 text-right font-medium">العملية</th>
                <th className="px-4 py-3 text-right font-medium">القسم</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-500">جاري التحميل...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-500">لا توجد سجلات</td></tr>
              ) : paginated.map(log => (
                <tr key={log.id} className="table-row">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{log.user_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${actionColor(log.action_type || '')}`}>{log.action_type}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{log.section_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary disabled:opacity-40 px-3 py-1.5 text-sm">السابق</button>
          <span className="text-slate-400 text-sm">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary disabled:opacity-40 px-3 py-1.5 text-sm">التالي</button>
        </div>
      )}
    </div>
  )
}
