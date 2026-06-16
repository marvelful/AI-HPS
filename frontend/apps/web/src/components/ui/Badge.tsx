import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Variant =
  | 'blue' | 'orange' | 'red' | 'amber' | 'green'
  | 'purple' | 'gray' | 'draft' | 'pending' | 'published' | 'archived'

const variantMap: Record<Variant, string> = {
  blue:      'bg-hgd-blue3 text-hgd-blue',
  orange:    'bg-hgd-orange3 text-hgd-orange',
  red:       'bg-clin-red-bg text-clin-red',
  amber:     'bg-clin-amber-bg text-clin-amber',
  green:     'bg-clin-green-bg text-clin-green',
  purple:    'bg-ai-purple-bg text-ai-purple',
  gray:      'bg-surf-alt text-text-sec',
  draft:     'bg-surf-alt text-text-sec',
  pending:   'bg-clin-amber-bg text-clin-amber',
  published: 'bg-clin-green-bg text-clin-green',
  archived:  'bg-[#ECEFF1] text-[#78909C]',
}

interface BadgeProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
        variantMap[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function RiskDot({ level }: { level: 'critical' | 'high' | 'medium' | 'low' }) {
  const colors = {
    critical: 'bg-clin-red',
    high:     'bg-clin-amber',
    medium:   'bg-clin-green',
    low:      'bg-text-sec',
  }
  return <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', colors[level])} />
}
