'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Flame, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-fire-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-fire-900/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(232,76,30,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,76,30,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-fire-500/15 border border-fire-500/30 mb-5 shadow-lg shadow-fire-500/20">
            <Flame className="w-10 h-10 text-fire-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">نظام مكافحة الحريق</h1>
          <p className="text-slate-500 text-sm">مشروع الطائف — نظام متابعة المشروع</p>
        </div>

        {/* Login Card */}
        <div className="card p-8 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-white mb-6">تسجيل الدخول</h2>

          {error && (
            <div className="alert-banner bg-red-500/10 border border-red-500/20 text-red-400 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pr-10"
                  placeholder="example@company.com"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10 pl-10"
                  placeholder="••••••••"
                  required
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-fire-500 hover:bg-fire-600 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white py-3 rounded-lg font-semibold transition-all duration-200 mt-2
                         shadow-lg shadow-fire-500/25 hover:shadow-fire-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الدخول...
                </span>
              ) : 'دخول'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          نظام متابعة مشروع مكافحة الحريق — الطائف © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
