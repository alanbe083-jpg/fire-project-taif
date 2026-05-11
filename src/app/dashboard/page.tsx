'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { HardHat, Truck, Wrench, Users, ClipboardCheck, Archive, Package, TrendingUp, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'

interface Stats {
  works: { total: number; completed: number; inProgress: number; avgProgress: number }
  vehicles: { total: number; active: number }
  tools: { total: number; available: number }
  workers: { total: number; active: number }
  approvals: { total: number; approved: number; pending: number }
  inventory: { total: number; lowStock: number }
  custody: { total: number; active: number }
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [worksByStatus, setWorksByStatus] = useState<any[]>([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [works, vehicles, tools, workers, approvals, inventory, custody, activity] = await Promise.all([
      supabase.from('works').select('status,progress'),
      supabase.from('vehicles').select('status'),
      supabase.from('tools').select('status,total_qty,available_qty'),
      supabase.from('workers').select('status'),
      supabase.from('approvals').select('status'),
      supabase.from('inventory').select('current_qty,min_qty'),
      supabase.from('custody').select('status'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(8),
    ])

    const worksData = works.data || []
    const avgProgress = worksData.length ? Math.round(worksData.reduce((s, w) => s + (w.progress || 0), 0) / worksData.length) : 0

    setStats({
      works: {
        total: worksData.length,
        completed: worksData.filter(w => w.status === 'منجز').length,
        inProgress: worksData.filter(w => w.status === 'جاري التنفيذ').length,
        avgProgress,
      },
      vehicles: { total: vehicles.data?.length || 0, active: vehicles.data?.filter(v => v.status === 'نشط').length || 0 },
      tools: { total: tools.data?.length || 0, available: tools.data?.filter(t => t.status === 'متاح').length || 0 },
      workers: { total: workers.data?.length || 0, active: workers.data?.filter(w => w.status === 'نشط').length || 0 },
      approvals: {
        total: approvals.data?.length || 0,
        approved: approvals.data?.filter(a => a.status === 'معتمد').length || 0,
        pending: approvals.data?.filter(a => a.status === 'تحت المراجعة').length || 0,
      },
      inventory: {
        total: inventory.data?.length || 0,
        lowStock: inventory.data?.filter(i => (i.current_qty || 0) < (i.min_qty || 0)).length || 0,
      },
      custody: { total: custody.data?.length || 0, active: custody.data?.filter(c => c.status === 'في العهدة').length || 0 },
    })

    setRecentActivity(activity.data || [])

    const statusMap = { 'منجز': 0, 'جاري التنفيذ': 0, 'لم يبدأ': 0, 'متوقف': 0 }
    worksData.forEach(w => { if (w.status in statusMap) (statusMap as any)[w.status]++ })
    setWorksByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-fire-500/30 border-t-fire-500 rounded-full animate-spin" />
    </div>
  )

  const statCards = [
    { label: 'الأعمال', value: stats!.works.total, sub: `${stats!.works.avgProgress}% نسبة الإنجاز`, icon: HardHat, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', href: '/dashboard/works' },
    { label: 'العاملين', value: stats!.workers.total, sub: `${stats!.workers.active} نشط`, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', href: '/dashboard/workers' },
    { label: 'العربات', value: stats!.vehicles.total, sub: `${stats!.vehicles.active} نشطة`, icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', href: '/dashboard/vehicles' },
    { label: 'العدة', value: stats!.tools.total, sub: `${stats!.tools.available} متاح`, icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', href: '/dashboard/tools' },
    { label: 'الاعتمادات', value: stats!.approvals.total, sub: `${stats!.approvals.approved} معتمد`, icon: ClipboardCheck, color: 'text-fire-400', bg: 'bg-fire-500/10 border-fire-500/20', href: '/dashboard/approvals' },
    { label: 'المخزون', value: stats!.inventory.total, sub: stats!.inventory.lowStock > 0 ? `⚠ ${stats!.inventory.lowStock} منخفض` : 'الكميات طبيعية', icon: Archive, color: stats!.inventory.lowStock > 0 ? 'text-red-400' : 'text-teal-400', bg: stats!.inventory.lowStock > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-teal-500/10 border-teal-500/20', href: '/dashboard/inventory' },
    { label: 'العهدة', value: stats!.custody.total, sub: `${stats!.custody.active} في العهدة`, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', href: '/dashboard/custody' },
    { label: 'نسبة الإنجاز الكلية', value: `${stats!.works.avgProgress}%`, sub: `${stats!.works.completed} عمل منجز`, icon: TrendingUp, color: 'text-fire-400', bg: 'bg-fire-500/10 border-fire-500/20', href: '/dashboard/works' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">مرحباً، {profile?.full_name} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">نظام متابعة مشروع مكافحة الحريق — الطائف</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}
            className={`card p-4 border hover:scale-[1.02] transition-all duration-200 cursor-pointer ${bg.split(' ')[0]}`}
            style={{ borderColor: 'transparent' }}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${bg} border flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            <p className={`text-xs mt-1 ${color}`}>{sub}</p>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Works by status */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">توزيع الأعمال حسب الحالة</h3>
          <div className="flex items-center gap-4">
            <PieChart width={140} height={140}>
              <Pie data={worksByStatus} dataKey="value" cx={65} cy={65} innerRadius={40} outerRadius={65}>
                {worksByStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {worksByStatus.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">ملخص تنفيذ المشروع</h3>
          <div className="space-y-4">
            {[
              { label: 'نسبة الإنجاز الكلية', value: stats!.works.avgProgress, color: 'bg-fire-500' },
              { label: 'العاملين النشطين', value: stats!.workers.total ? Math.round(stats!.workers.active / stats!.workers.total * 100) : 0, color: 'bg-emerald-500' },
              { label: 'العربات النشطة', value: stats!.vehicles.total ? Math.round(stats!.vehicles.active / stats!.vehicles.total * 100) : 0, color: 'bg-amber-500' },
              { label: 'الاعتمادات المكتملة', value: stats!.approvals.total ? Math.round(stats!.approvals.approved / stats!.approvals.total * 100) : 0, color: 'bg-blue-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white font-medium">{value}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${color}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-fire-400" />
            آخر النشاطات
          </h3>
          <Link href="/dashboard/activity" className="text-fire-400 text-xs hover:underline">عرض الكل</Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">لا توجد نشاطات بعد</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-fire-500 shrink-0" />
                <span className="text-slate-400 font-medium">{a.user_name}</span>
                <span className="text-slate-500">{a.action_type}</span>
                <span className="text-slate-600 text-xs mr-auto">
                  {new Date(a.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
