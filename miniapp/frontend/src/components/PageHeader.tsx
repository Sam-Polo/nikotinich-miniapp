import { useNavigate } from 'react-router-dom'

type Props = {
  title: string
  subtitle?: string
  showBack?: boolean
  right?: React.ReactNode
}

// заголовок страницы в стиле Figma-макетов
export default function PageHeader({ title, subtitle, showBack = false, right }: Props) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 bg-white z-40 border-b border-border-light">
      <div className="flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-accent text-[16px] font-normal"
          >
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад
          </button>
        )}
        <div className="flex-1 text-center">
          <p className="text-[16px] font-semibold text-text-primary leading-tight">{title}</p>
          {subtitle && <p className="text-[12px] text-text-secondary">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center">{right}</div>}
        {!right && <div className="w-16" />}
      </div>
    </header>
  )
}
