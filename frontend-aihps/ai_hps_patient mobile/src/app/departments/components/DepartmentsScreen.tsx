'use client';
import React, { useState, useMemo } from 'react';
import { Search, X, Clock, MapPin, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { proceduresApi, type Department } from '@/lib/api';

function getDeptIcon(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('urgence') || n.includes('emergency')) return '🚨';
  if (n.includes('cardio')) return '❤️';
  if (n.includes('pédiatrie') || n.includes('pediatrie') || n.includes('pediatric')) return '👶';
  if (n.includes('maternité') || n.includes('maternit')) return '🌸';
  if (n.includes('radiologie') || n.includes('radiology')) return '🔬';
  if (n.includes('laboratoire') || n.includes('laborat')) return '🧪';
  if (n.includes('pharmac')) return '💊';
  if (n.includes('chirurgie') || n.includes('surgery')) return '🔪';
  return '🏥';
}

function getDeptStyle(name: string): { color: string; bg: string } {
  const n = (name || '').toLowerCase();
  if (n.includes('urgence') || n.includes('emergency')) return { color: 'var(--critical)', bg: '#FEF2F2' };
  if (n.includes('cardio')) return { color: 'var(--primary)', bg: 'var(--primary-light)' };
  if (n.includes('pédiatrie') || n.includes('pediatrie')) return { color: '#0891B2', bg: '#E0F7FA' };
  if (n.includes('maternité') || n.includes('maternit')) return { color: '#C2185B', bg: '#FCE4EC' };
  if (n.includes('radiologie')) return { color: '#5B21B6', bg: '#F3E8FF' };
  if (n.includes('laboratoire')) return { color: '#D97706', bg: '#FEF3C7' };
  if (n.includes('pharmac')) return { color: '#2E7D32', bg: '#F0FDF4' };
  if (n.includes('chirurgie') || n.includes('surgery')) return { color: '#64748B', bg: '#F1F5F9' };
  return { color: 'var(--foreground)', bg: 'var(--muted)' };
}

function formatHours(operating_hours: Record<string, any>): string {
  if (!operating_hours || Object.keys(operating_hours).length === 0) return 'Voir les horaires';
  const values = Object.values(operating_hours);
  if (values.some((v) => v === '24/7' || v === 'open' || v === '24h/24')) return '24h/24 — 7j/7';
  const firstVal = values.find((v) => v && typeof v === 'string');
  return firstVal || 'Voir les horaires';
}

function SkeletonDeptCard({ id }: { id: string }) {
  return (
    <div key={id} className="card-base p-4">
      <div className="flex items-start gap-3">
        <div className="skeleton-shimmer w-12 h-12 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          <div className="skeleton-shimmer h-3 w-1/2 rounded" />
          <div className="skeleton-shimmer h-3 w-2/5 rounded" />
        </div>
      </div>
    </div>
  );
}

const MapPreview = () => (
  <div className="card-base p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <MapPin size={16} color="var(--primary)" />
        <span className="text-sm font-bold text-foreground">Plan de l&apos;hôpital</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">Vue simplifiée</span>
    </div>

    {/* Floor Map Grid */}
    <div
      className="rounded-xl p-3 relative"
      style={{ background: '#F8FAFF', border: '1px solid var(--border)' }}
    >
      {/* Floor label */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">RDC + Étages</span>
      </div>

      {/* Grid of department boxes */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Row 1 */}
        <div className="col-span-2 rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: '#FEF2F2', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: '#C62828' }}>UR</span>
          <span className="text-[8px] font-medium" style={{ color: '#C62828' }}>Urgences</span>
        </div>
        <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: '#F0FDF4', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: '#2E7D32' }}>PH</span>
          <span className="text-[8px] font-medium" style={{ color: '#2E7D32' }}>Pharma</span>
        </div>
        <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: '#FEF3C7', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: '#D97706' }}>LA</span>
          <span className="text-[8px] font-medium" style={{ color: '#D97706' }}>Labo</span>
        </div>

        {/* Row 2 */}
        <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: 'var(--primary-light)', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: 'var(--primary)' }}>CA</span>
          <span className="text-[8px] font-medium" style={{ color: 'var(--primary)' }}>Cardio</span>
        </div>
        <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: '#F3E8FF', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: '#5B21B6' }}>RA</span>
          <span className="text-[8px] font-medium" style={{ color: '#5B21B6' }}>Radio</span>
        </div>
        <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: '#E0F7FA', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: '#0891B2' }}>PD</span>
          <span className="text-[8px] font-medium" style={{ color: '#0891B2' }}>Pédiat.</span>
        </div>
        <div className="rounded-lg p-2 flex flex-col items-center justify-center" style={{ background: '#FCE4EC', minHeight: '44px' }}>
          <span className="text-[10px] font-extrabold" style={{ color: '#C2185B' }}>MA</span>
          <span className="text-[8px] font-medium" style={{ color: '#C2185B' }}>Matern.</span>
        </div>

        {/* Row 3 */}
        <div className="col-span-4 rounded-lg p-2 flex items-center justify-center gap-2" style={{ background: '#F1F5F9', minHeight: '36px' }}>
          {/* Dotted path */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7]?.map((i) => (
              <div
                key={`path-dot-${i}`}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: i % 2 === 0 ? '#64748B' : 'transparent', border: '1px dashed #94A3B8' }}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold" style={{ color: '#64748B' }}>CH Étage 5</span>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground mt-2 text-center">
        Entrée principale → Ascenseur central
      </p>
    </div>
  </div>
);

export default function DepartmentsScreen() {
  const [search, setSearch] = useState('');

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => proceduresApi.listDepartments(),
  });

  const filtered = useMemo(() => {
    const list = departments || [];
    const q = search?.toLowerCase();
    if (!q) return list;
    return list.filter((d: Department) =>
      d?.name?.toLowerCase()?.includes(q) ||
      (d?.location || '').toLowerCase().includes(q)
    );
  }, [departments, search]);

  return (
    <div>
      {/* Header */}
      <div className="gradient-primary px-4 pt-12 pb-14 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'var(--secondary)' }} />
        <h1 className="text-white text-xl font-bold relative mb-1">Départements</h1>
        <p className="text-blue-200 text-xs relative mb-4">Hôpital Général de Douala</p>

        <div className="relative">
          <Search size={16} color="var(--muted-foreground)" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e?.target?.value)}
            placeholder="Rechercher un département..."
            className="w-full bg-white rounded-xl pl-9 pr-9 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Effacer">
              <X size={14} color="var(--muted-foreground)" />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 -mt-4 relative z-10 pb-4">
        <MapPreview />

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {['skel-d1', 'skel-d2', 'skel-d3', 'skel-d4'].map((id) => (
              <SkeletonDeptCard key={id} id={id} />
            ))}
          </div>
        )}

        {/* Department list */}
        {!isLoading && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium">
              {filtered?.length} département{filtered?.length !== 1 ? 's' : ''}
            </p>

            {filtered?.map((dept: Department) => {
              const icon = getDeptIcon(dept.name);
              const style = getDeptStyle(dept.name);
              const floor = dept.location || '';
              const hours = formatHours(dept.operating_hours);
              const isOpen = dept.is_active;
              const guidePrompt = `I am at the main entrance. Guide me to ${dept.name}.`;

              return (
                <div key={dept?.id} className="card-base p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: style.bg }}
                    >
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-foreground font-bold text-sm leading-snug">{dept?.name}</h3>
                        <span
                          className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isOpen ? '#F0FDF4' : '#F1F5F9',
                            color: isOpen ? '#2E7D32' : '#64748B',
                          }}
                        >
                          {isOpen ? 'Ouvert' : 'Fermé'}
                        </span>
                      </div>

                      {floor ? (
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin size={11} color="var(--muted-foreground)" />
                          <span className="text-xs text-muted-foreground font-medium">{floor}</span>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-1.5 mb-3">
                        <Clock size={11} color="var(--muted-foreground)" />
                        <span className="text-xs text-muted-foreground">{hours}</span>
                      </div>

                      <Link
                        href={`/ai-assistant?prompt=${encodeURIComponent(guidePrompt)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                        style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}
                      >
                        <Navigation size={12} />
                        Guide me
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
