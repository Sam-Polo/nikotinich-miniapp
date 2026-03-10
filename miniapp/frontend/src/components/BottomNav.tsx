import { NavLink } from 'react-router-dom'
import { useCartStore } from '../store/cart'

// иконки нижней навигации по эталону toolbar.png: контурные, акцент #007AFF
const color = (active: boolean) => (active ? '#007AFF' : '#8E8E93')

const CatalogIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="6" height="6" rx="1.5" stroke={color(active)} strokeWidth="2" fill="none" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" stroke={color(active)} strokeWidth="2" fill="none" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" stroke={color(active)} strokeWidth="2" fill="none" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" stroke={color(active)} strokeWidth="2" fill="none" />
  </svg>
)

const NewsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M5 8v8l10 4V4L5 8z" stroke={color(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 8l5-2v12l-5-2" stroke={color(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 10l2.5-.5M20 14l2 .5" stroke={color(active)} strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const FavoritesIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke={color(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={active ? '#007AFF' : 'none'} />
  </svg>
)

const CartIcon = ({ active, count }: { active: boolean; count: number }) => (
  <div className="relative">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={color(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke={color(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    )}
  </div>
)

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke={color(active)} strokeWidth="2" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke={color(active)} strokeWidth="2" strokeLinecap="round" />
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
