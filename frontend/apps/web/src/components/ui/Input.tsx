import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-sec uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-text-pri',
            'placeholder:text-text-sec/60',
            'focus:outline-none focus:ring-2 focus:ring-hgd-blue focus:border-hgd-blue',
            'disabled:bg-surf-alt disabled:cursor-not-allowed',
            error && 'border-clin-red focus:ring-clin-red',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-clin-red">{error}</p>}
        {hint && !error && <p className="text-xs text-text-sec">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
