import { Link } from 'react-router-dom'
import {
  MessageSquare, Zap, CheckSquare,
  BarChart2, Shield, Users, Cpu,
  Smartphone, Monitor, ArrowRight,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-white font-sans overflow-x-hidden">
      {/* Header */}
      <header
        className="relative px-8 py-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{
            top: -80, right: -80, width: 320, height: 320,
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: -40, left: 200, width: 180, height: 180,
            background: 'rgba(232,98,10,0.12)',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            AI-<span className="text-[#F47D2C]">HPS</span>
          </h1>
          <p className="text-xs text-white/60 mt-1 uppercase tracking-wider">
            Hôpital Général de Douala · Procedural Intelligence
          </p>
          <p className="mt-4 text-base text-white/85 max-w-xl">
            Clinically safe, AI-assisted hospital operations — from triage to discharge.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            {['Procedural AI', 'Stream A · B', 'RBAC · JWT', 'Cameroon'].map((pill) => (
              <span
                key={pill}
                className="px-3 py-1 rounded-full text-[11px] text-white/80 border border-white/20"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Cards */}
      <main className="max-w-6xl mx-auto px-8 py-12 grid md:grid-cols-2 gap-6">
        {/* Mobile App Card */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4 hover:bg-white/8 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8620A]/20 flex items-center justify-center">
              <Smartphone className="text-[#F47D2C]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Mobile App</h2>
              <p className="text-xs text-white/50">Patient &amp; visitor mobile</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {[
              { icon: MessageSquare, text: 'ChatGPT-style hospital assistant', color: 'text-[#F47D2C]' },
              { icon: Zap,           text: 'Emergency triage in 2 taps',       color: 'text-[#F47D2C]' },
              { icon: CheckSquare,   text: 'Browse procedures by department',   color: 'text-[#F47D2C]' },
            ].map(({ icon: Icon, text, color }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-white/75">
                <Icon size={14} className={color} />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-2 space-y-2">
            <Link
              to="/patient/register"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#E8620A] text-white text-sm font-bold py-3 hover:bg-[#F47D2C] transition-colors"
            >
              Create Patient Account <ArrowRight size={14} />
            </Link>
            <Link
              to="/patient/login"
              className="flex items-center justify-center gap-2 w-full rounded-lg text-white/70 text-sm font-medium py-2 border border-white/15 hover:bg-white/5 transition-colors"
            >
              Patient Sign In
            </Link>
          </div>
        </div>

        {/* Web Admin Card */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4 hover:bg-white/8 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#004A8F]/40 flex items-center justify-center">
              <Monitor className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Web Admin Portal</h2>
              <p className="text-xs text-white/50">For admins &amp; clinical staff</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {[
              { icon: BarChart2, text: 'Real-time operational dashboards' },
              { icon: Shield,    text: 'Audit trails & compliance reporting' },
              { icon: Cpu,       text: 'AI activity & confidence monitoring' },
              { icon: Users,     text: 'Role management & RBAC' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-white/75">
                <Icon size={14} className="text-white/70" />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-2">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#004A8F] text-white text-sm font-bold py-3 hover:bg-[#0062B8] transition-colors border border-white/10"
            >
              Open Admin Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-10 text-xs text-white/25 px-8">
        AI-HPS v1.0 · Hôpital Général de Douala, Cameroon ·{' '}
        <span className="italic">
          Clinically safe, AI-assisted hospital operations
        </span>
        <br />
        <span className="mt-1 block">
          UI prototype · No real patient data · All workflows are illustrative
        </span>
      </footer>
    </div>
  )
}
