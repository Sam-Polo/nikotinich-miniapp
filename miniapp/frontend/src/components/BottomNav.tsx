import { NavLink } from 'react-router-dom'
import { useCartStore } from '../store/cart'

// палитра для иконок тулбара: серый / наш синий
const navColor = (active: boolean) => (active ? '#007AFF' : '#999999')

// catalog.svg
const CatalogIcon = ({ active }: { active: boolean }) => {
  const stroke = navColor(active)
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14 20.4V14.6C14 14.2686 14.2686 14 14.6 14H20.4C20.7314 14 21 14.2686 21 14.6V20.4C21 20.7314 20.7314 21 20.4 21H14.6C14.2686 21 14 20.7314 14 20.4Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M3 20.4V14.6C3 14.2686 3.26863 14 3.6 14H9.4C9.73137 14 10 14.2686 10 14.6V20.4C10 20.7314 9.73137 21 9.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M14 9.4V3.6C14 3.26863 14.2686 3 14.6 3H20.4C20.7314 3 21 3.26863 21 3.6V9.4C21 9.73137 20.7314 10 20.4 10H14.6C14.2686 10 14 9.73137 14 9.4Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M3 9.4V3.6C3 3.26863 3.26863 3 3.6 3H9.4C9.73137 3 10 3.26863 10 3.6V9.4C10 9.73137 9.73137 10 9.4 10H3.6C3.26863 10 3 9.73137 3 9.4Z" stroke={stroke} strokeWidth="1.5" />
    </svg>
  )
}

// используем прежний рупор для новостей (из макета)
const NewsIcon = ({ active }: { active: boolean }) => {
  const stroke = navColor(active)
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 8v8l10 4V4L5 8z" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8l5-2v12l-5-2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10l2.5-.5M20 14l2 .5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// heart.svg (контур), подсветка синим при активном разделе
const FavoritesIcon = ({ active }: { active: boolean }) => {
  const stroke = active ? '#007AFF' : '#6A6A6A'
  const fill = active ? '#007AFF' : 'none'
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <path d="M9.2085 4.31689C9.94366 4.31689 10.6718 4.46142 11.3511 4.74268C12.0304 5.02407 12.6485 5.43662 13.1685 5.95654L13.647 6.43506L13.9995 6.78857L14.353 6.43604L14.8315 5.9585H14.8325C15.8826 4.90832 17.3064 4.31806 18.7915 4.31787C19.5269 4.31782 20.2556 4.46226 20.9351 4.74365C21.6144 5.025 22.2315 5.43766 22.7515 5.95752C23.2715 6.47744 23.6848 7.0946 23.9663 7.77393C24.2478 8.45335 24.392 9.18206 24.3921 9.91748C24.3921 10.6527 24.2476 11.3807 23.9663 12.0601C23.72 12.6547 23.3732 13.2023 22.9419 13.6782L22.7524 13.8774L14.0005 22.6274L5.24854 13.8765C4.72861 13.3565 4.31606 12.7384 4.03467 12.0591C3.75341 11.3799 3.60889 10.6517 3.60889 9.9165C3.6089 9.18131 3.75337 8.45318 4.03467 7.77393C4.31608 7.09453 4.72855 6.47653 5.24854 5.95654C5.76852 5.43656 6.38653 5.02409 7.06592 4.74268C7.74517 4.46138 8.4733 4.31691 9.2085 4.31689Z" stroke={stroke} fill={fill} />
      <path d="M4.89546 14.2298C4.32905 13.6634 3.87974 12.991 3.5732 12.2509C3.26666 11.5108 3.10889 10.7177 3.10889 9.91663C3.10889 9.1156 3.26666 8.32242 3.5732 7.58236C3.87974 6.84231 4.32905 6.16988 4.89546 5.60347C5.46187 5.03705 6.1343 4.58775 6.87436 4.28121C7.61441 3.97467 8.4076 3.81689 9.20863 3.81689C10.0097 3.81689 10.8028 3.97467 11.5429 4.28121C12.2829 4.58775 12.9554 5.03705 13.5218 5.60347L14.0001 6.0818L14.4785 5.60463C15.6224 4.46056 17.1739 3.81776 18.7918 3.81765C19.5929 3.81759 20.3861 3.97533 21.1263 4.28184C21.8664 4.58835 22.5389 5.03764 23.1054 5.60405C23.6719 6.17046 24.1212 6.84291 24.4279 7.58299C24.7345 8.32308 24.8923 9.11631 24.8924 9.91739C24.8924 10.7185 24.7347 11.5117 24.4282 12.2518C24.1217 12.992 23.6724 13.6645 23.106 14.231L14.0001 23.3345L4.89546 14.2298Z" stroke={stroke} strokeLinecap="square" fill="none" />
    </svg>
  )
}

// cart.svg
const CartIcon = ({ active, count }: { active: boolean; count: number }) => {
  const fill = navColor(active)
  return (
    <div className="relative">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2.03469 2.78158C2.43143 2.66256 2.84954 2.8877 2.96857 3.28444L3.55822 5.24995H22.0002C22.2373 5.24995 22.4604 5.36205 22.6019 5.55226C22.7434 5.74246 22.7867 5.98838 22.7186 6.21546L19.7186 16.2155C19.6234 16.5327 19.3314 16.75 19.0002 16.75H6.0002C5.66899 16.75 5.377 16.5327 5.28183 16.2155L1.53183 3.71546C1.4128 3.31872 1.63794 2.90061 2.03469 2.78158ZM4.00822 6.74995L6.55822 15.25H18.4422L20.9922 6.74995H4.00822Z"
          fill={fill}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 18.75C8.41421 18.75 8.75 19.0858 8.75 19.5C8.75 19.9142 9.08579 20.25 9.5 20.25C9.91421 20.25 10.25 19.9142 10.25 19.5C10.25 19.0858 10.5858 18.75 11 18.75C11.4142 18.75 11.75 19.0858 11.75 19.5C11.75 20.7426 10.7426 21.75 9.5 21.75C8.25736 21.75 7.25 20.7426 7.25 19.5C7.25 19.0858 7.58579 18.75 8 18.75Z"
          fill={fill}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14 18.75C14.4142 18.75 14.75 19.0858 14.75 19.5C14.75 19.9142 15.0858 20.25 15.5 20.25C15.9142 20.25 16.25 19.9142 16.25 19.5C16.25 19.0858 16.5858 18.75 17 18.75C17.4142 18.75 17.75 19.0858 17.75 19.5C17.75 20.7426 16.7426 21.75 15.5 21.75C14.2574 21.75 13.25 20.7426 13.25 19.5C13.25 19.0858 13.5858 18.75 14 18.75Z"
          fill={fill}
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  )
}

// profile.svg
const ProfileIcon = ({ active }: { active: boolean }) => {
  const stroke = navColor(active)
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M16 7C16 8.06087 15.5786 9.07828 14.8284 9.82843C14.0783 10.5786 13.0609 11 12 11C10.9391 11 9.92172 10.5786 9.17157 9.82843C8.42143 9.07828 8 8.06087 8 7C8 5.93913 8.42143 4.92172 9.17157 4.17157C9.92172 3.42143 10.9391 3 12 3C13.0609 3 14.0783 3.42143 14.8284 4.17157C15.5786 4.92172 16 5.93913 16 7ZM12 14C10.1435 14 8.36301 14.7375 7.05025 16.0503C5.7375 17.363 5 19.1435 5 21H19C19 19.1435 18.2625 17.363 16.9497 16.0503C15.637 14.7375 13.8565 14 12 14Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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
