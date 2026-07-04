import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Shield, Bell, Globe, ArrowLeftRight } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

export default function PatientProfilePage() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [lang, setLang] = useState<'EN' | 'FR'>('EN')

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'PT'

  const handleSignOut = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-8 text-white flex-shrink-0 flex flex-col items-center"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-3">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
        <p className="text-lg font-bold">{user?.full_name ?? 'Patient'}</p>
        <p className="text-sm text-white/70 mt-0.5">
          Patient · ID {user?.id?.slice(-4)?.toUpperCase() ?? '0001'} · HGD
        </p>
        {user?.department_id && (
          <p className="text-xs text-white/60 mt-0.5">Dept. {user.department_id.slice(0, 8)}</p>
        )}
      </div>

      {/* Settings */}
      <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">

        {/* Preferences */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <p className="text-[10px] font-bold text-text-sec uppercase tracking-widest px-4 pt-3 pb-1">Preferences</p>

          {/* Notifications */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-slate-50">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Bell size={16} className="text-hgd-blue" />
            </div>
            <p className="flex-1 text-sm font-medium text-text-pri">Notifications</p>
            <button
              onClick={() => setNotificationsOn((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${notificationsOn ? 'bg-hgd-blue' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notificationsOn ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-hgd-blue" />
            </div>
            <p className="flex-1 text-sm font-medium text-text-pri">Language</p>
            <div className="flex rounded-full border border-slate-200 overflow-hidden">
              {(['FR', 'EN'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${lang === l ? 'bg-hgd-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-hgd-blue" />
            </div>
            <p className="flex-1 text-sm font-medium text-text-pri">Privacy & data</p>
            <ChevronRight size={16} className="text-slate-300" />
          </div>
        </div>

        {/* Staff mode */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <p className="text-[10px] font-bold text-text-sec uppercase tracking-widest px-4 pt-3 pb-1">Access</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-slate-50 hover:bg-surf-screen transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-hgd-orange3 flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight size={16} className="text-hgd-orange" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-text-pri">Switch to staff mode</p>
              <p className="text-[10px] text-text-sec mt-0.5">Demo procedural execution workflows</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 hover:bg-red-50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
            <LogOut size={16} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-red-500">Sign out</p>
        </button>

        <p className="text-center text-[10px] text-slate-300 pb-2">AI-HPS · HGD Douala · v1.0.0</p>
      </div>
    </div>
  )
}
