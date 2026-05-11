'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  Flame, LayoutDashboard, HardHat, Truck, Wrench, Users, 
  ClipboardCheck, FileText, Package, Archive, BarChart3, 
  Activity, LogOut, X, ChevronLeft, Shield
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/dashboard/works', icon: HardHat, label: 'الأعمال' },
  { href: '/dashboard/vehicles', icon: Truck, label: 'العربات' },
  { href: '/dashboard/tools', icon: Wrench, label: 'العدة' },
  { href: '/dashboard/workers', icon: Users, label: 'العاملين' },
  { href: '/dashboard/approvals', icon: ClipboardCheck, label: 'الاعتمادات' },
  { href: '/dashboard/documents', icon: FileText, label: 'الورقيات والمستندات' },
  { href: '/dashboard/custody', icon: Package, label: 'العهدة' },
  { href: '/dashboard/inventory', icon: Archive, label: 'المخزون' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'التقارير' },
  { href: '/dashboard/activity', icon: Activity, label: 'سجل العمليات' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isAdmin, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 h-full w-64 bg-slate-900 border-l border-slate-800 z-40
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-fire-500/20 border border-fire-500/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-fire-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">نظام مكافحة الحريق</p>
              <p className="text-slate-500 text-xs">الطائف</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-fire-500/20 border border-fire-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-fire-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'مستخدم'}</p>
              <span className={`text-xs ${isAdmin ? 'text-fire-400' : 'text-slate-500'}`}>
                {isAdmin ? 'مدير النظام' : 'مشاهد فقط'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <button
                key={href}
                onClick={() => { router.push(href); onClose() }}
                className={`sidebar-item w-full text-right ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {isActive && <ChevronLeft className="w-3 h-3 mr-auto opacity-60" />}
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-slate-800">
          <button onClick={handleSignOut}
            className="sidebar-item sidebar-item-inactive w-full text-right text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  )
}
