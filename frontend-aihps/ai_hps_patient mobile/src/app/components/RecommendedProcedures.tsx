'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { proceduresApi, type Procedure } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const i18n = {
  fr: {
    title: 'Procédures Recommandées',
    seeAll: 'Voir tout',
    steps: (n: number) => `${n} étape${n > 1 ? 's' : ''}`,
    viewPDF: 'PDF',
    risk: { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' },
  },
  en: {
    title: 'Recommended Procedures',
    seeAll: 'See all',
    steps: (n: number) => `${n} step${n > 1 ? 's' : ''}`,
    viewPDF: 'PDF',
    risk: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' },
  },
};

function getRiskStyle(level: string, lang: 'fr' | 'en'): { label: string; color: string; bg: string } {
  const labels = i18n[lang].risk as Record<string, string>;
  switch (level) {
    case 'critical': return { label: labels.critical, color: 'var(--critical)', bg: '#FEF2F2' };
    case 'high':     return { label: labels.high,     color: '#C62828',          bg: '#FFEBEE' };
    case 'medium':   return { label: labels.medium,   color: '#E65100',          bg: '#FEF0E6' };
    case 'low':      return { label: labels.low,      color: 'var(--safe)',       bg: '#F0FDF4' };
    default:         return { label: level || '—',    color: 'var(--muted-foreground)', bg: 'var(--muted)' };
  }
}

export default function RecommendedProcedures() {
  const { patient } = useAuthStore();
  const lang: 'fr' | 'en' = patient?.language ?? 'fr';
  const t = i18n[lang];

  const { data } = useQuery({
    queryKey: ['recommended-procedures', lang],
    queryFn: () => proceduresApi.list({ status: 'published', limit: 4 }),
  });

  const procedures = (data?.items || [])
    .filter((p: Procedure) => p.stream_target === 'A' || p.stream_target === 'both')
    .slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-foreground font-bold text-base">{t.title}</h2>
        <Link
          href="/procedures"
          className="flex items-center gap-1 text-primary text-xs font-semibold"
        >
          {t.seeAll}
          <ChevronRight size={14} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {procedures.map((proc: Procedure) => {
          const risk = getRiskStyle(proc.risk_level, lang);
          const langBadge = (proc.language || 'fr').toUpperCase().slice(0, 2);
          const stepsCount = (proc.steps || []).length;

          const cardContent = (
            <div className="card-base p-3 flex-shrink-0 w-44">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: risk.bg, color: risk.color }}
                >
                  {risk.label}
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: langBadge === 'EN' ? 'var(--primary-light)' : 'var(--secondary-light)',
                    color: langBadge === 'EN' ? 'var(--primary)' : 'var(--secondary)',
                  }}
                >
                  {langBadge}
                </span>
              </div>
              <h3 className="text-foreground text-xs font-bold leading-snug mb-1">{proc.title}</h3>
              <p className="text-muted-foreground text-[10px] mb-2">{proc.summary || ''}</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px]">
                  {stepsCount > 0 ? t.steps(stepsCount) : ''}
                </span>
                {proc.document_url && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: '#E65100' }}>
                    <FileText size={10} />
                    {t.viewPDF}
                  </span>
                )}
              </div>
            </div>
          );

          if (proc.document_url) {
            return (
              <a
                key={proc.id}
                href={proc.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {cardContent}
              </a>
            );
          }
          return <div key={proc.id}>{cardContent}</div>;
        })}
      </div>
    </div>
  );
}
