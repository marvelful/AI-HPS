import React from 'react';

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

const dotColors: Record<RiskLevel, string> = {
  critical: '#C62828',
  high: '#E65100',
  medium: '#F59E0B',
  low: '#2E7D32',
};

interface RiskDotProps {
  level: RiskLevel;
  className?: string;
}

export default function RiskDot({ level, className = '' }: RiskDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${className}`}
      style={{ backgroundColor: dotColors[level] }}
      title={`Risk: ${level}`}
    />
  );
}