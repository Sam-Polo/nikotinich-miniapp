import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import WebApp from '@twa-dev/sdk'
import { trackVisit, upsertUser, getSettings } from './api'
import { useUserStore } from './store/user'
import BottomNav from './components/BottomNav'
import CatalogPage from './pages/CatalogPage'
import CategoryPage from './pages/CategoryPage'
import ProductPage from './pages/ProductPage'
import NewsPage from './pages/NewsPage'
import FavoritesPage from './pages/FavoritesPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import OrderDetailsPage from './pages/OrderDetailsPage'
import ProfilePage from './pages/ProfilePage'
import CollectionDetailPage from './pages/CollectionDetailPage'
import NewsDetailPage from './pages/NewsDetailPage'

export default function App() {
  const { setUser, setSettings } = useUserStore()

  useEffect(() => {
    // инициализация Telegram WebApp SDK
    try {
      WebApp.ready()
      WebApp.expand()
    } catch { /* вне Telegram — игнорируем */ }

    // загружаем настройки (доставка, реферальные %)
    getSettings().then(setSettings).catch(() => {})

    // определяем пользователя из Telegram initData
    let telegramId: string | undefined
    let username: string | undefined
    let referrerId: string | undefined

    try {
      const tgUser = WebApp.initDataUnsafe?.user
      if (tgUser?.id) {
        telegramId = String(tgUser.id)
        username = tgUser.username || tgUser.first_name || undefined
      }
      // start_param может содержать ref_<telegram_id> реферера
      const startParam = WebApp.initDataUnsafe?.start_param
      if (startParam?.startsWith('ref_')) {
        referrerId = startParam.slice(4)
      }
    } catch { /* нет initData */ }

    if (telegramId) {
      // создаём или обновляем пользователя
      upsertUser({ telegram_id: telegramId, username, referrer_id: referrerId })
        .then(setUser)
        .catch(() => {})

      // фиксируем визит
      trackVisit(telegramId).catch(() => {})
    }
  }, [])

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
      <div className="flex flex-col min-h-full">
        <Routes>
          {/* все экраны с нижней навигацией — навигация всегда видна */}
          <Route path="/" element={<WithNav><CatalogPage /></WithNav>} />
          <Route path="/news" element={<WithNav><NewsPage /></WithNav>} />
          <Route path="/favorites" element={<WithNav><FavoritesPage /></WithNav>} />
          <Route path="/cart" element={<WithNav><CartPage /></WithNav>} />
          <Route path="/profile" element={<WithNav><ProfilePage /></WithNav>} />
          <Route path="/catalog/:categoryKey" element={<WithNav><CategoryPage /></WithNav>} />
          <Route path="/collection/:id" element={<WithNav><CollectionDetailPage /></WithNav>} />
          <Route path="/news/:id" element={<WithNav><NewsDetailPage /></WithNav>} />
          <Route path="/product/:slug" element={<WithNav><ProductPage /></WithNav>} />
          <Route path="/checkout" element={<WithNav><CheckoutPage /></WithNav>} />
          <Route path="/order-success/:orderId" element={<WithNav><OrderSuccessPage /></WithNav>} />
          <Route path="/order/:orderId" element={<WithNav><OrderDetailsPage /></WithNav>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

// обёртка для экранов с нижней навигацией
function WithNav({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
