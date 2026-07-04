import { Link } from 'react-router-dom'
import {
  BarChart2, Shield, Cpu, Users,
  CheckCircle, ArrowRight, Activity,
} from 'lucide-react'

const features = [
  { icon: BarChart2, text: 'Real-time operational dashboards' },
  { icon: Shield,    text: 'Audit trails & compliance reporting' },
  { icon: Cpu,       text: 'AI activity & confidence monitoring' },
  { icon: Users,     text: 'Role management & RBAC' },
  { icon: Activity,  text: 'Procedure approval workflows' },
  { icon: CheckCircle, text: 'Stream A · B clinical decision support' },
]

export default function StaffLandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-white font-sans flex flex-col">
      {/* Header */}
      <header
        className="relative px-10 py-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 320, height: 320, background: 'rgba(255,255,255,0.04)' }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: -40, left: 200, width: 180, height: 180, background: 'rgba(232,98,10,0.12)' }}
        />

        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <span className="text-white font-black text-lg leading-none">H</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                AI-<span className="text-[#F47D2C]">HPS</span>
              </h1>
              <p className="text-[11px] text-white/55 uppercase tracking-widest">Staff Portal</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight max-w-xl">
            Clinical Intelligence<br />
            <span className="text-[#F47D2C]">for HGD Staff</span>
          </h2>
          <p className="mt-3 text-base text-white/75 max-w-md">
            Hôpital Général de Douala's AI-powered procedure management system for admins, clinicians and department heads.
          </p>

          <div className="flex flex-wrap gap-2.5 mt-5">
            {['RBAC · JWT', 'Stream A · B', 'Cameroon', 'v1.0'].map((pill) => (
              <span
                key={pill}
                className="px-3 py-1 rounded-full text-[11px] text-white/75 border border-white/20"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-10 py-12 grid md:grid-cols-2 gap-10 items-start">
        {/* Feature list */}
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
            Portal capabilities
          </p>
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-white/60" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Staff & Admin Access</h3>
            <p className="text-sm text-white/55 mt-1">
              Authorised HGD personnel only. Use your hospital credentials.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#004A8F] text-white text-sm font-bold py-3.5 hover:bg-[#0062B8] transition-colors border border-white/10"
            >
              Sign in to Portal <ArrowRight size={15} />
            </Link>
            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-2 w-full rounded-xl text-white/60 text-sm font-medium py-2.5 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <div className="border-t border-white/10 pt-4 mt-1">
            <p className="text-xs text-white/35 leading-relaxed">
              The patient mobile portal runs separately on a different address.
              Please direct patients to their own login.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center pb-8 text-xs text-white/25 px-8">
        AI-HPS v1.0 · Hôpital Général de Douala, Cameroon ·{' '}
        <span className="italic">Clinically safe, AI-assisted hospital operations</span>
      </footer>
    </div>
  )
}
