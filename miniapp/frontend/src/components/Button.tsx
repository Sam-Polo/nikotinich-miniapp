import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]',
  secondary: 'bg-bg-base text-text-primary hover:bg-gray-200 active:scale-[0.98]',
  ghost: 'bg-transparent text-accent hover:bg-blue-50 active:scale-[0.98]',
  danger: 'bg-destructive text-white hover:opacity-90 active:scale-[0.98]'
}

export default function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'rounded-btn font-semibold text-[16px] px-5 py-[14px]',
        'transition-all duration-150 select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
