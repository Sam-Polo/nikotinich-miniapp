import { NavLink } from 'react-router-dom'
import { useCartStore } from '../store/cart'

// иконки нижней навигации (SVG inline)
const CatalogIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="2" fill={active ? '#007AFF' : '#8E8E93'} />
    <rect x="14" y="3" width="7" height="7" rx="2" fill={active ? '#007AFF' : '#8E8E93'} />
    <rect x="3" y="14" width="7" height="7" rx="2" fill={active ? '#007AFF' : '#8E8E93'} />
    <rect x="14" y="14" width="7" height="7" rx="2" fill={active ? '#007AFF' : '#8E8E93'} />
  </svg>
)

const NewsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M4 10h10M4 14h12M4 18h8" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" />
    <path d="M18 14l-2 2 2 2 4-4-4-4-2 2 2 2z" fill={active ? '#007AFF' : '#8E8E93'} />
  </svg>
)

const FavoritesIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 21.593c-.525-.327-4.25-2.83-6.393-5.125C3.43 14.085 3 12.41 3 11a5 5 0 0 1 9-3A5 5 0 0 1 21 11c0 1.41-.43 3.085-2.607 5.468C16.25 18.763 12.525 21.266 12 21.593z"
      fill={active ? '#FF3B30' : 'none'} stroke={active ? '#FF3B30' : '#8E8E93'} strokeWidth="2" />
  </svg>
)

const CartIcon = ({ active, count }: { active: boolean; count: number }) => (
  <div className="relative">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    )}
  </div>
)

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7" r="4" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" />
  </svg>
)

const NAV_ITEMS = [
  { path: '/', label: 'Каталог', icon: CatalogIcon },
  { path: '/news', label: 'Новости', icon: NewsIcon },
  { path: '/favorites', label: 'Избранное', icon: FavoritesIcon },
  { path: '/cart', label: 'Корзина', icon: CartIcon },
  { path: '/profile', label: 'Профиль', icon: ProfileIcon }
]

export default function BottomNav() {
  const cartCount = useCartStore(s => s.totalItems())

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light pb-safe z-50">
      <div className="flex justify-around items-center h-14">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className="flex flex-col items-center gap-0.5 flex-1 py-2 touch-manipulation"
          >
            {({ isActive }) => (
              <>
                {/* @ts-expect-error count prop только у CartIcon */}
                <Icon active={isActive} count={path === '/cart' ? cartCount : undefined} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
