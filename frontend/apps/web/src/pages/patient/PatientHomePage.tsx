import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, ChevronRight, Clock, MapPin, AlertTriangle, Bell } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function todayLabel() {
  const d = new Date()
  return `${DAY_NAMES[d.getDay()]} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

const recommendedProcedures = [
  {
    id: '1',
    title: 'Adult Suspected Stroke — Door to CT under 25 min',
    dept: 'Emergency',
    steps: 5,
    duration: '10 min',
    priority: 'critical' as const,
  },
  {
    id: '2',
    title: 'Pre-eclampsia Management Protocol',
    dept: 'Maternity',
    steps: 4,
    duration: '18 min',
    priority: 'high' as const,
  },
]

const latestUpdates = [
  { id: '1', text: 'Your procedure request has been approved', time: '2h ago', type: 'approval' as const },
  { id: '2', text: 'Stroke Alert: New CT triage protocol active', time: 'Today', type: 'alert' as const },
]

const priorityStyle = {
  critical: 'bg-red-50 text-red-600 border border-red-200',
  high: 'bg-orange-50 text-orange-600 border border-orange-200',
  moderate: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-green-50 text-green-700 border border-green-200',
}

export default function PatientHomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(' ')[0] ?? 'Patient'

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xl font-bold tracking-tight">Hello, {firstName} 👋</p>
            <p className="text-sm text-white/70 mt-0.5">{todayLabel()}</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-4 -mt-3 space-y-4 pb-6">

        {/* AI Assistant card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-hgd-blue flex items-center justify-center flex-shrink-0">
              <MessageSquare size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-pri">AI Assistant</p>
              <p className="text-[10px] text-green-600 font-medium">● Online · grounded in HGD protocols</p>
            </div>
          </div>
          <p className="text-sm text-text-sec bg-slate-50 rounded-xl px-3 py-2 mb-3 italic">
            "Where can I get a blood test at HGD?"
          </p>
          <button
            onClick={() => navigate('/patient/assistant')}
            className="w-full flex items-center justify-center gap-2 bg-hgd-blue text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-hgd-blue2 transition-colors"
          >
            Ask the AI assistant
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Upcoming appointment */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-text-sec uppercase tracking-wide">Upcoming appointment</p>
            <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
              On time
            </span>
          </div>
          <p className="text-base font-bold text-text-pri">Cardiology — Dr. Bayem</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-sec">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Today · 14:30
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              2nd Floor, Wing B
            </span>
          </div>
          <Link
            to="/patient/departments"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-hgd-blue hover:underline"
          >
            Get directions
            <ChevronRight size={12} />
          </Link>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/patient/procedures?dept=Emergency"
            className="flex flex-col items-center gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 hover:bg-red-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <p className="text-[11px] font-bold text-red-600 text-center leading-tight">Emergency</p>
          </Link>
          <Link
            to="/patient/departments"
            className="flex flex-col items-center gap-2 bg-hgd-blue3 border border-hgd-blue/20 rounded-2xl p-3 hover:bg-blue-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-hgd-blue/10 flex items-center justify-center">
              <MapPin size={18} className="text-hgd-blue" />
            </div>
            <p className="text-[11px] font-bold text-hgd-blue text-center leading-tight">Find dept.</p>
          </Link>
          <Link
            to="/patient/procedures"
            className="flex flex-col items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl p-3 hover:bg-orange-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hgd-orange">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-hgd-orange text-center leading-tight">My procedures</p>
          </Link>
        </div>

        {/* Recommended for you */}
        <div>
          <p className="text-sm font-bold text-text-pri mb-3">Recommended for you</p>
          <div className="space-y-2">
            {recommendedProcedures.map((p) => (
              <Link
                key={p.id}
                to={`/patient/procedure/${p.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 hover:bg-surf-screen transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-pri leading-snug">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-text-sec">{p.dept}</span>
                    <span className="text-[10px] text-text-sec">·</span>
                    <span className="text-[10px] text-text-sec">{p.steps} steps</span>
                    <span className="text-[10px] text-text-sec">·</span>
                    <span className="text-[10px] text-text-sec">{p.duration}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityStyle[p.priority]}`}>
                    {p.priority}
                  </span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest updates */}
        <div>
          <p className="text-sm font-bold text-text-pri mb-3">Latest updates</p>
          <div className="space-y-2">
            {latestUpdates.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${u.type === 'alert' ? 'bg-red-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-pri leading-snug">{u.text}</p>
                  <p className="text-[10px] text-text-sec mt-1">{u.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
