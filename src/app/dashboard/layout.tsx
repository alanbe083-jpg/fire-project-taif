'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar from '@/components/layout/Sidebar'
import { Menu, Bell, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isExpiringSoon, isExpired } from '@/lib/utils'

interface Alert { message: string; type: 'warning' | 'danger' }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (user) loadAlerts()
  }, [user])

  async function loadAlerts() {
    const list: Alert[] = []
    
    // Workers expiry
    const { data: workers } = await supabase.from('workers').select('worker_name,iqama_expiry,work_permit_expiry')
    workers?.forEach(w => {
      if (isExpired(w.iqama_expiry)) list.push({ message: `إقامة ${w.worker_name} منتهية`, type: 'danger' })
      else if (isExpiringSoon(w.iqama_expiry)) list.push({ message: `إقامة ${w.worker_name} تنتهي قريباً`, type: 'warning' })
      if (isExpired(w.work_permit_expiry)) list.push({ message: `رخصة عمل ${w.worker_name} منتهية`, type: 'danger' })
      else if (isExpiringSoon(w.work_permit_expiry)) list.push({ message: `رخصة عمل ${w.worker_name} تنتهي قريباً`, type: 'warning' })
    })

    // Vehicles expiry
    const { data: vehicles } = await supabase.from('vehicles').select('vehicle_no,registration_expiry,insurance_expiry')
    vehicles?.forEach(v => {
      if (isExpired(v.registration_expiry)) list.push({ message: `استمارة العربة ${v.vehicle_no} منتهية`, type: 'danger' })
      else if (isExpiringSoon(v.registration_expiry)) list.push({ message: `استمارة العربة ${v.vehicle_no} تنتهي قريباً`, type: 'warning' })
      if (isExpired(v.insurance_expiry)) list.push({ message: `تأمين العربة ${v.vehicle_no} منتهي`, type: 'danger' })
      else if (isExpiringSoon(v.insurance_expiry)) list.push({ message: `تأمين العربة ${v.vehicle_no} ينتهي قريباً`, type: 'warning' })
    })

    // Documents
    const { data: docs } = await supabase.from('documents').select('document_name,expiry_date')
    docs?.forEach(d => {
      if (isExpired(d.expiry_date)) list.push({ message: `المستند "${d.document_name}" منتهي`, type: 'danger' })
      else if (isExpiringSoon(d.expiry_date)) list.push({ message: `المستند "${d.document_name}" ينتهي قريباً`, type: 'warning' })
    })

    // Low inventory
    const { data: inv } = await supabase.from('inventory').select('item_name,current_qty,min_qty')
    inv?.forEach(i => {
      if ((i.current_qty || 0) < (i.min_qty || 0))
        list.push({ message: `المخزون منخفض: ${i.item_name}`, type: 'danger' })
    })

    // Rejected approvals
    const { data: apps } = await supabase.from('approvals').select('material_name,status').in('status', ['مرفوض', 'يحتاج تعديل'])
    apps?.forEach(a => list.push({ message: `اعتماد "${a.material_name}" — ${a.status}`, type: a.status === 'مرفوض' ? 'danger' : 'warning' }))

    setAlerts(list)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-fire-500/30 border-t-fire-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const dangerAlerts = alerts.filter(a => a.type === 'danger').length
  const warningAlerts = alerts.filter(a => a.type === 'warning').length

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:mr-0" />

          {/* Alerts bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold
                  ${dangerAlerts > 0 ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>

            {showAlerts && alerts.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">التنبيهات ({alerts.length})</span>
                  <button onClick={() => setShowAlerts(false)} className="text-slate-500 hover:text-white text-xs">إغلاق</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {alerts.map((a, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 border-b border-slate-800/50
                      ${a.type === 'danger' ? 'bg-red-500/5' : 'bg-amber-500/5'}`}>
                      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
                      <p className="text-sm text-slate-300">{a.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
