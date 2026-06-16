import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation } from 'lucide-react'

const DEPARTMENTS = [
  { name: 'Emergency',   floor: 'Ground Floor',   wing: '',          color: 'bg-red-500'    },
  { name: 'Cardiology',  floor: '2nd Floor',      wing: 'Wing B',    color: 'bg-hgd-blue'   },
  { name: 'Pediatrics',  floor: '3rd Floor',      wing: 'Wing A',    color: 'bg-blue-400'   },
  { name: 'Maternity',   floor: '4th Floor',      wing: '',          color: 'bg-pink-400'   },
  { name: 'Radiology',   floor: '1st Floor',      wing: '',          color: 'bg-purple-500' },
  { name: 'Laboratory',  floor: 'Basement 1',     wing: '',          color: 'bg-amber-500'  },
  { name: 'Pharmacy',    floor: 'Ground Floor',   wing: 'Wing C',    color: 'bg-green-500'  },
  { name: 'Surgery',     floor: '5th Floor',      wing: '',          color: 'bg-slate-600'  },
]

function floorLabel(dept: typeof DEPARTMENTS[0]) {
  return dept.wing ? `${dept.floor}, ${dept.wing}` : dept.floor
}

function MapPreview() {
  return (
    <div className="bg-hgd-blue3 border border-hgd-blue/20 rounded-2xl overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-hgd-blue/10 to-hgd-blue/5 flex items-center justify-center">
        {/* Simplified hospital floor plan illustration */}
        <div className="absolute inset-4 grid grid-cols-3 gap-2 opacity-60">
          {['bg-red-300','bg-blue-300','bg-pink-200','bg-purple-200','bg-amber-200','bg-green-200'].map((c, i) => (
            <div key={i} className={`${c} rounded-lg`} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-1">
          <MapPin size={28} className="text-hgd-blue" />
          <p className="text-xs font-bold text-hgd-blue">Interactive map preview</p>
          <p className="text-[10px] text-hgd-blue/70">Tap "Guide me" to navigate</p>
        </div>
      </div>
    </div>
  )
}

export default function PatientDepartmentsPage() {
  const navigate = useNavigate()

  const handleGuideMe = (dept: string) => {
    navigate(`/patient/assistant?q=How do I get to ${encodeURIComponent(dept)}`)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        <p className="text-xl font-bold tracking-tight">Hospital map</p>
        <p className="text-sm text-white/70 mt-1">Find any department</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Map preview */}
        <MapPreview />

        {/* Department list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.name} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-9 h-9 rounded-xl ${dept.color} flex items-center justify-center flex-shrink-0`}>
                <MapPin size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-pri">{dept.name}</p>
                <p className="text-[11px] text-text-sec mt-0.5">{floorLabel(dept)}</p>
              </div>
              <button
                onClick={() => handleGuideMe(dept.name)}
                className="flex items-center gap-1 text-[11px] font-bold text-hgd-blue border border-hgd-blue/30 bg-hgd-blue3 rounded-full px-3 py-1.5 hover:bg-hgd-blue hover:text-white transition-colors flex-shrink-0"
              >
                <Navigation size={11} />
                Guide me
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
