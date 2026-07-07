'use client';
import React, { useState, useMemo } from 'react';
import { Search, X, AlertTriangle, RefreshCw, BookOpen, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { proceduresApi, type Procedure, type Department } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const i18n = {
  fr: {
    title: 'Procédures Médicales',
    subtitle: 'Guides patients — HGD',
    searchPlaceholder: 'Rechercher une procédure...',
    all: 'Tous',
    errorTitle: 'Erreur de chargement',
    errorMsg: 'Impossible de charger les procédures. Vérifiez votre connexion.',
    retry: 'Réessayer',
    emptyTitle: 'Aucune procédure trouvée',
    emptySearch: (q: string, dept: string) => `Aucun résultat pour "${q}" dans ${dept}.`,
    emptyDefault: 'Aucune procédure disponible pour le moment.',
    resetFilters: 'Réinitialiser les filtres',
    found: (n: number) => `${n} procédure${n > 1 ? 's' : ''} trouvée${n > 1 ? 's' : ''}`,
    steps: (n: number) => `${n} étape${n > 1 ? 's' : ''}`,
    viewPDF: 'Voir PDF',
    tapToView: 'Appuyer pour voir',
    risk: { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' },
  },
  en: {
    title: 'Medical Procedures',
    subtitle: 'Patient guides — HGD',
    searchPlaceholder: 'Search a procedure...',
    all: 'All',
    errorTitle: 'Failed to load',
    errorMsg: 'Could not load procedures. Check your connection.',
    retry: 'Retry',
    emptyTitle: 'No procedures found',
    emptySearch: (q: string, dept: string) => `No results for "${q}" in ${dept}.`,
    emptyDefault: 'No procedures available at the moment.',
    resetFilters: 'Reset filters',
    found: (n: number) => `${n} procedure${n > 1 ? 's' : ''} found`,
    steps: (n: number) => `${n} step${n > 1 ? 's' : ''}`,
    viewPDF: 'View PDF',
    tapToView: 'Tap to view',
    risk: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' },
  },
};

function getRiskStyle(level: string, lang: 'fr' | 'en'): { label: string; color: string; bg: string } {
  const labels = i18n[lang].risk as Record<string, string>;
  switch (level) {
    case 'critical': return { label: labels.critical, color: 'var(--critical)', bg: '#FEF2F2' };
    case 'high':     return { label: labels.high,     color: '#C62828',          bg: '#FFEBEE' };
    case 'medium':   return { label: labels.medium,   color: '#E65100',          bg: '#FEF3E2' };
    case 'low':      return { label: labels.low,      color: '#2E7D32',          bg: '#F0FDF4' };
    default:         return { label: level || '—',    color: 'var(--muted-foreground)', bg: 'var(--muted)' };
  }
}

function SkeletonCard({ id }: { id: string }) {
  return (
    <div key={id} className="card-base p-4 space-y-3">
      <div className="flex gap-2">
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
        <div className="skeleton-shimmer h-5 w-8 rounded" />
      </div>
      <div className="skeleton-shimmer h-4 w-4/5 rounded" />
      <div className="skeleton-shimmer h-3 w-3/5 rounded" />
      <div className="skeleton-shimmer h-3 w-2/5 rounded" />
    </div>
  );
}

export default function ProceduresScreen() {
  const { patient } = useAuthStore();
  const lang: 'fr' | 'en' = patient?.language ?? 'fr';
  const t = i18n[lang];

  const [search, setSearch] = useState('');
  const [activeDept, setActiveDept] = useState(t.all);

  const { data: proceduresData, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient-procedures'],
    queryFn: () => proceduresApi.list({ status: 'published', limit: 100 }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => proceduresApi.listDepartments(),
  });

  const deptNames = useMemo(() => {
    const map: Record<string, string> = {};
    (departments || []).forEach((d: Department) => { map[d.id] = d.name; });
    return map;
  }, [departments]);

  const allProcedures = useMemo(() =>
    (proceduresData?.items || []).filter(
      (p: Procedure) => p.stream_target === 'A' || p.stream_target === 'both'
    ),
    [proceduresData]
  );

  const allLabel = t.all;
  const deptOptions = useMemo(() => {
    const names = new Set<string>();
    allProcedures.forEach((p: Procedure) => {
      if (p.department_id && deptNames[p.department_id]) {
        names.add(deptNames[p.department_id]);
      }
    });
    return [allLabel, ...Array.from(names)];
  }, [allProcedures, deptNames, allLabel]);

  const effectiveDept = deptOptions.includes(activeDept) ? activeDept : allLabel;

  const filtered = useMemo(() => {
    return allProcedures.filter((p: Procedure) => {
      const deptName = p.department_id ? (deptNames[p.department_id] || '') : '';
      const matchDept = effectiveDept === allLabel || deptName === effectiveDept;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.summary || '').toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q);
      return matchDept && matchSearch;
    });
  }, [allProcedures, search, effectiveDept, deptNames, allLabel]);

  return (
    <div>
      {/* Header */}
      <div className="gradient-primary px-4 pt-12 pb-14 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'var(--secondary)' }} />
        <h1 className="text-white text-xl font-bold relative mb-1">{t.title}</h1>
        <p className="text-blue-200 text-xs relative mb-4">{t.subtitle}</p>

        {/* Search */}
        <div className="relative">
          <Search size={16} color="var(--muted-foreground)" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-white rounded-xl pl-9 pr-9 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={lang === 'fr' ? 'Effacer' : 'Clear'}
            >
              <X size={14} color="var(--muted-foreground)" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 -mt-4 relative z-10">
        {/* Department Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 pt-1">
          {deptOptions.map((dept) => (
            <button
              key={`dept-chip-${dept}`}
              onClick={() => setActiveDept(dept)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95"
              style={{
                background: effectiveDept === dept ? 'var(--primary)' : 'white',
                color: effectiveDept === dept ? 'white' : 'var(--muted-foreground)',
                border: effectiveDept === dept ? 'none' : '1px solid var(--border)',
              }}
            >
              {dept}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3 mt-2">
            {['skel-1', 'skel-2', 'skel-3'].map((id) => (
              <SkeletonCard key={id} id={id} />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle size={40} color="var(--warning)" className="mb-3" />
            <h3 className="text-foreground font-bold text-base mb-1">{t.errorTitle}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t.errorMsg}</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 btn-primary w-auto px-6">
              <RefreshCw size={16} />
              {t.retry}
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={40} color="var(--muted-foreground)" className="mb-3" />
            <h3 className="text-foreground font-bold text-base mb-1">{t.emptyTitle}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? t.emptySearch(search, effectiveDept) : t.emptyDefault}
            </p>
            <button
              onClick={() => { setSearch(''); setActiveDept(allLabel); }}
              className="text-sm font-semibold"
              style={{ color: 'var(--primary)' }}
            >
              {t.resetFilters}
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-3 mt-2 pb-4">
            <p className="text-muted-foreground text-xs font-medium">{t.found(filtered.length)}</p>
            {filtered.map((proc: Procedure) => {
              const risk = getRiskStyle(proc.risk_level, lang);
              const langBadge = (proc.language || 'fr').toUpperCase().slice(0, 2);
              const deptName = proc.department_id ? (deptNames[proc.department_id] || 'HGD') : 'HGD';
              const stepsCount = (proc.steps || []).length;
              const versionBadge = `v${proc.version}`;

              const cardBody = (
                <>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: risk.bg, color: risk.color }}
                    >
                      {risk.label}
                    </span>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: langBadge === 'EN' ? 'var(--primary-light)' : 'var(--secondary-light)',
                        color: langBadge === 'EN' ? 'var(--primary)' : 'var(--secondary)',
                      }}
                    >
                      {langBadge}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{versionBadge}</span>
                  </div>

                  <h3 className="text-foreground font-bold text-sm leading-snug mb-1">{proc.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                    {proc.summary || proc.content?.slice(0, 100) || ''}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                      >
                        {deptName}
                      </span>
                      {stepsCount > 0 && (
                        <span className="text-xs text-muted-foreground">{t.steps(stepsCount)}</span>
                      )}
                    </div>
                    {proc.document_url && (
                      <span
                        className="flex items-center gap-1 text-xs font-bold"
                        style={{ color: 'var(--warning)' }}
                      >
                        <FileText size={12} />
                        {t.viewPDF}
                      </span>
                    )}
                  </div>
                </>
              );

              if (proc.document_url) {
                return (
                  <a
                    key={proc.id}
                    href={proc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-base p-4 block active:scale-[0.99] transition-transform"
                  >
                    {cardBody}
                  </a>
                );
              }

              return (
                <div key={proc.id} className="card-base p-4">
                  {cardBody}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
