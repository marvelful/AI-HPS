import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, X } from 'lucide-react'
import { RiskDot } from '@/components/ui/Badge'

const procedures = [
  { id: '1', title: 'Haemorrhage Control Protocol',    dept: 'Emergency', risk: 'critical' as const, updated: '2h ago'  },
  { id: '2', title: 'ICU Sepsis Management Protocol', dept: 'ICU',       risk: 'high'     as const, updated: 'Today'   },
  { id: '3', title: 'Blood Transfusion SOP v4',       dept: 'Blood Bank',risk: 'high'     as const, updated: 'Jun 15'  },
  { id: '4', title: 'Neonatal Resuscitation',         dept: 'Maternity', risk: 'critical' as const, updated: 'Jun 12'  },
  { id: '5', title: 'Malaria Treatment Guideline',    dept: 'General',   risk: 'medium'   as const, updated: 'Jun 10'  },
  { id: '6', title: 'Surgical Site Infection',        dept: 'Surgery',   risk: 'medium'   as const, updated: 'Jun 8'   },
  { id: '7', title: 'Pharmacy Dispensing Protocol',   dept: 'Pharmacy',  risk: 'medium'   as const, updated: 'Jun 5'   },
  { id: '8', title: 'ICU Ventilator Weaning',         dept: 'ICU',       risk: 'high'     as const, updated: 'Jun 3'   },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')

  const results = query.trim()
    ? procedures.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.dept.toLowerCase().includes(query.toLowerCase()),
      )
    : []

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-text-pri">Search Procedures</h1>

      {/* Search input */}
      <div className="relative">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search procedures, departments..."
          className="w-full pl-9 pr-9 py-3 border border-[#CBD5E1] rounded-full text-sm bg-white text-text-pri placeholder:text-text-sec/60 focus:outline-none focus:ring-2 focus:ring-hgd-blue shadow-card"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sec hover:text-text-pri"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim() ? (
        results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-text-sec">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
            {results.map((p) => (
              <Link
                key={p.id}
                to={`/patient/procedure/${p.id}`}
                className="flex items-center gap-3 bg-white rounded-lg shadow-card px-4 py-3.5 hover:bg-surf-screen transition-colors"
              >
                <RiskDot level={p.risk} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-pri truncate">{p.title}</p>
                  <p className="text-xs text-text-sec mt-0.5">{p.dept} · {p.updated}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <SearchIcon size={32} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm font-medium text-text-sec">No procedures found</p>
            <p className="text-xs text-text-sec mt-1">Try a different keyword or browse by department</p>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <SearchIcon size={32} className="text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-sm text-text-sec">Search for procedures, protocols, or departments</p>
        </div>
      )}
    </div>
  )
}
