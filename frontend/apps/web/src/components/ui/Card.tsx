import { cn } from '@/lib/utils'
import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  accent?: 'blue' | 'orange' | 'red' | 'green' | 'amber' | 'purple'
  padding?: 'sm' | 'md' | 'lg'
}

const accentMap = {
  blue:   'border-l-4 border-l-hgd-blue',
  orange: 'border-l-4 border-l-hgd-orange',
  red:    'border-l-4 border-l-clin-red',
  green:  'border-l-4 border-l-clin-green',
  amber:  'border-l-4 border-l-clin-amber',
  purple: 'border-l-4 border-l-ai-purple',
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, accent, padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-card',
        accent && accentMap[accent],
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function KPICard({
  title,
  value,
  trend,
  trendUp,
  accent = 'blue',
}: {
  title: string
  value: string | number
  trend?: string
  trendUp?: boolean
  accent?: 'blue' | 'orange' | 'red' | 'green' | 'amber' | 'purple'
}) {
  return (
    <Card accent={accent} padding="md">
      <p className="text-xs font-semibold text-text-sec uppercase tracking-wide leading-tight">{title}</p>
      <p
        className={cn('text-3xl font-bold mt-1 mb-0.5', {
          'text-clin-red':   accent === 'red',
          'text-hgd-orange': accent === 'orange',
          'text-clin-green': accent === 'green',
          'text-ai-purple':  accent === 'purple',
          'text-text-pri':   accent === 'blue' || accent === 'amber',
        })}
      >
        {value}
      </p>
      {trend && (
        <p className={cn('text-xs font-semibold', trendUp ? 'text-clin-green' : 'text-clin-red')}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </Card>
  )
}
