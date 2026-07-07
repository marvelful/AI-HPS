import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: string | null;
  trendPositive?: boolean;
  accentColor: string;
  icon?: React.ReactNode;
}

export default function KPICard({ title, value, trend, trendPositive = true, accentColor, icon }: KPICardProps) {
  return (
    <div
      className="bg-card rounded-md shadow-card p-4 flex flex-col gap-2 border-l-4 hover:shadow-card-md transition-shadow duration-200"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex items-center justify-between">
        <span className="label-meta text-muted-foreground">{title}</span>
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-foreground tabular-nums" style={{ fontSize: '28px' }}>{value}</div>
      {trend && (
        <div className={`text-xs font-medium flex items-center gap-1 ${trendPositive ? 'text-clinical-green' : 'text-clinical-red'}`}>
          {trend}
        </div>
      )}
    </div>
  );
}