'use client'
import { useState, useMemo } from 'react'
import { Search, Filter, ChevronRight, ChevronLeft, ArrowUpDown } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchKeys?: (keyof T)[]
  filterKey?: keyof T
  filterOptions?: { value: string; label: string }[]
  emptyMessage?: string
  actions?: (row: T) => React.ReactNode
}

const PAGE_SIZE = 15

export default function DataTable<T extends { id: string }>({
  data, columns, searchKeys = [], filterKey, filterOptions, emptyMessage = 'لا توجد بيانات', actions
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row =>
        searchKeys.some(key => String((row as any)[key] || '').toLowerCase().includes(q))
      )
    }
    if (filter !== 'all' && filterKey) {
      result = result.filter(row => (row as any)[filterKey] === filter)
    }
    if (sortKey) {
      result.sort((a, b) => {
        const av = String((a as any)[sortKey] || '')
        const bv = String((b as any)[sortKey] || '')
        return sortDir === 'asc' ? av.localeCompare(bv, 'ar') : bv.localeCompare(av, 'ar')
      })
    }
    return result
  }, [data, search, filter, sortKey, sortDir, searchKeys, filterKey])

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field pr-10"
            placeholder="بحث..."
          />
        </div>
        {filterKey && filterOptions && (
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setPage(1) }}
              className="input-field pr-10 sm:w-48"
            >
              <option value="all">كل الحالات</option>
              {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Count */}
      <p className="text-slate-500 text-xs">
        {filtered.length > 0 ? `عرض ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} من ${filtered.length} سجل` : ''}
      </p>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                {columns.map(col => (
                  <th key={String(col.key)} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {col.sortable ? (
                      <button onClick={() => toggleSort(String(col.key))} className="flex items-center gap-1 hover:text-white transition-colors">
                        {col.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    ) : col.label}
                  </th>
                ))}
                {actions && <th className="px-4 py-3 text-right font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-slate-500">{emptyMessage}</td></tr>
              ) : paginated.map(row => (
                <tr key={row.id} className="table-row">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3">{actions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary disabled:opacity-40 px-2 py-1.5">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-slate-400 text-sm px-3">صفحة {page} من {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="btn-secondary disabled:opacity-40 px-2 py-1.5">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
