// общая навигация админки: на мобильных — только иконки, на ПК — текст
type AdminPageKey = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'models' | 'content' | 'orders' | 'users' | 'referral'

const NAV_ITEMS: { page: AdminPageKey; label: string; icon: React.ReactNode }[] = [
  { page: 'products', label: 'Товары', icon: <ProductsIcon /> },
  { page: 'categories', label: 'Категории', icon: <CategoriesIcon /> },
  { page: 'brands', label: 'Бренды', icon: <BrandsIcon /> },
  { page: 'lines', label: 'Линейки', icon: <LinesIcon /> },
  { page: 'models', label: 'Модели', icon: <LinesIcon /> },
  { page: 'content', label: 'Контент', icon: <ContentIcon /> },
  { page: 'promocodes', label: 'Промокоды', icon: <PromocodesIcon /> },
  { page: 'orders', label: 'Заказы', icon: <OrdersIcon /> },
  { page: 'users', label: 'Пользователи', icon: <UsersIcon /> },
  { page: 'referral', label: 'Реферальная система', icon: <ReferralIcon /> }
]

function ProductsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 01-8 0" />
    </svg>
  )
}
function CategoriesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function BrandsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  )
}
function LinesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
function ContentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </svg>
  )
}
function PromocodesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6M2 9v6M22 9v6" />
    </svg>
  )
}
function OrdersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}
function ReferralIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
    </svg>
  )
}

type Props = {
  currentPage: AdminPageKey
  onNavigate?: (page: AdminPageKey) => void
}

export default function AdminNav({ currentPage, onNavigate }: Props) {
  return (
    <div className="header-nav">
      {NAV_ITEMS.map(({ page, label, icon }) => (
        <button
          key={page}
          type="button"
          className={`nav-btn ${currentPage === page ? 'active' : ''}`}
          onClick={() => onNavigate?.(page)}
          title={label}
        >
          <span className="nav-btn-icon" aria-hidden>{icon}</span>
          <span className="nav-btn-text">{label}</span>
        </button>
      ))}
    </div>
  )
}
