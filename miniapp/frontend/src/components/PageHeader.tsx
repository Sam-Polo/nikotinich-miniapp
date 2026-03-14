import { useNavigate } from 'react-router-dom'

type Props = {
  title: string
  subtitle?: string
  showBack?: boolean
  /** если задан — вызывается по клику «Назад» вместо navigate(-1) */
  onBack?: () => void
  right?: React.ReactNode
}

// заголовок страницы в стиле Figma-макетов
export default function PageHeader({ title, subtitle, showBack = false, onBack, right }: Props) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 bg-white z-40 border-b border-border-light relative">
      <div className="flex items-center justify-between h-14 px-4">
        {/* левая зона — фиксированная ширина, чтобы не сдвигать центр */}
        <div className="min-w-[72px] flex items-center">
          {showBack ? (
            <button
              onClick={onBack ?? (() => navigate(-1))}
              className="flex items-center gap-1 text-accent text-[14px] font-normal"
            >
              <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                <path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Назад
            </button>
          ) : null}
        </div>

        {/* заголовок — абсолютно по центру экрана, не зависит от боковых кнопок */}
        <div className="absolute left-0 right-0 flex justify-center items-center h-14 pointer-events-none">
          <div className="pointer-events-auto">
            <p className="text-[16px] font-semibold text-text-primary leading-tight">{title}</p>
            {subtitle && <p className="text-[12px] text-text-secondary">{subtitle}</p>}
          </div>
        </div>

        {/* правая зона — та же ширина для симметрии */}
        <div className="min-w-[72px] flex items-center justify-end">
          {right ?? null}
        </div>
      </div>
    </header>
  )
}
