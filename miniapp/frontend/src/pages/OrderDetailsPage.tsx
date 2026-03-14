import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserOrders, getProducts, cancelOrder } from '../api'
import type { Order, OrderItem, Product } from '../api'
import { useUserStore } from '../store/user'
import PageHeader from '../components/PageHeader'
import Price from '../components/Price'
import { OrderDetailsSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'
import { useCartStore } from '../store/cart'
import WebApp from '@twa-dev/sdk'

function formatDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' +
    date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// имя пользователя или id менеджера для кнопки «Поддержка» — из .env
// приоритет: VITE_SUPPORT_TG_USERNAME (openTelegramLink) > VITE_SUPPORT_TG_ID (openLink с tg://)
const SUPPORT_TG_USERNAME = (import.meta.env.VITE_SUPPORT_TG_USERNAME as string | undefined)?.trim().replace(/^@/, '') || ''
const SUPPORT_TG_ID = (import.meta.env.VITE_SUPPORT_TG_ID as string | undefined)?.trim() || ''

function getOrderStatusTitle(status?: string) {
  const s = String(status || '').toLowerCase()
  if (s === 'confirmed') return 'Заказ подтверждён'
  if (s === 'packed') return 'Заказ в пути'
  if (s === 'completed') return 'Заказ получен'
  if (s === 'cancelled') return 'Заказ отменён'
  return 'Новый заказ'
}

function normalizePhone(phone?: string) {
  const value = String(phone || '').trim()
  if (!value) return ''
  if (value.includes('#ERROR') || value.startsWith('#')) return ''
  return value
}

export default function OrderDetailsPage() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const user = useUserStore(s => s.user)
  const addItem = useCartStore(s => s.addItem)
  const clearCart = useCartStore(s => s.clearCart)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [productImages, setProductImages] = useState<Record<string, string>>({})
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!user?.telegram_id || !orderId) {
      setLoading(false)
      return
    }

    setLoading(true)
    getUserOrders(user.telegram_id)
      .then(async list => {
        const found = list.find(o => o.id === orderId) ?? null
        setOrder(found)
        if (found && found.items.length > 0) {
          const slugs = found.items.map(i => i.slug).filter(Boolean)
          try {
            const prods = await getProducts({ slugs })
            const map: Record<string, string> = {}
            prods.forEach((p: Product) => { if (p.images?.[0]) map[p.slug] = p.images[0] })
            setProductImages(map)
          } catch { /* игнорируем */ }
        }
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [user?.telegram_id, orderId])

  const title = useMemo(() => getOrderStatusTitle(order?.status), [order?.status])

  function handleCopyOrderId() {
    if (!order) return
    navigator.clipboard.writeText(order.id).then(() => {
      toast.success('Номер заказа скопирован')
    }).catch(() => toast.error('Не удалось скопировать'))
  }

  async function handleCancel() {
    if (!order || !user?.telegram_id) return
    if (order.status === 'completed' || order.status === 'cancelled') return
    setCancelling(true)
    try {
      await cancelOrder(order.id, user.telegram_id)
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null)
      toast.success('Заказ отменён')
    } catch (e: any) {
      const msg = e?.message || ''
      toast.error(msg === 'order_already_final' ? 'Заказ уже завершён' : 'Не удалось отменить заказ')
    } finally {
      setCancelling(false)
    }
  }

  function handleSupport() {
    // путь 1: username → openTelegramLink принимает только https://t.me/
    if (SUPPORT_TG_USERNAME) {
      const url = `https://t.me/${SUPPORT_TG_USERNAME}`
      try {
        WebApp.openTelegramLink(url)
      } catch {
        window.open(url, '_blank')
      }
      return
    }

    // путь 2: числовой id → openLink прокидывает tg:// в нативный клиент
    if (!SUPPORT_TG_ID) {
      toast.error('поддержка недоступна')
      return
    }
    const numericId = SUPPORT_TG_ID.replace(/[^0-9-]/g, '')
    if (!numericId) {
      toast.error('id поддержки настроен неверно')
      return
    }

    const tgLink = `tg://user?id=${numericId}`

    try {
      // openLink (в отличие от openTelegramLink) передаёт tg:// в ОС
      if (WebApp?.openLink) {
        WebApp.openLink(tgLink)
        return
      }
    } catch {
      // игнорируем — идём в fallback
    }

    window.open(tgLink, '_blank')
  }

  async function handleRepeatOrder() {
    if (!order || order.status !== 'completed') return
    const slugs = Array.from(new Set(order.items.map(i => i.slug).filter(Boolean)))
    if (!slugs.length) {
      toast.error('В заказе нет товаров')
      return
    }

    try {
      const products = await getProducts({ slugs })
      const bySlug = new Map(products.map(p => [p.slug, p]))
      const matched = order.items
        .map((i) => ({ item: i, product: bySlug.get(i.slug) }))
        .filter((x): x is { item: OrderItem; product: Product } => !!x.product)

      if (!matched.length) {
        toast.error('Товары из заказа недоступны')
        return
      }

      clearCart()
      matched.forEach(({ product, item }) => {
        addItem(product, item.qty || 1)
      })

      toast.success('Заказ добавлен в корзину')
      navigate('/cart')
    } catch {
      toast.error('Не удалось повторить заказ')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <OrderDetailsSkeleton />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <p className="text-text-secondary text-center mt-10 px-4">Заказ не найден</p>
      </div>
    )
  }

  const status = String(order.status || '').toLowerCase()
  const canRepeat = status === 'completed'
  const canCancel = status === 'new' || status === 'packed'
  const canReturn = status === 'confirmed' || status === 'completed'
  const showSupport = !!SUPPORT_TG_ID
  const phone = normalizePhone(order.phone)

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-32">
        {/* номер заказа с кнопкой копирования (без дефиса — только первые 8 символов uuid) */}
        <div className="flex items-center gap-2 text-text-secondary text-[14px] mb-2">
          <span>№{order.id.replace(/-/g, '').slice(0, 8)}</span>
          <button
            type="button"
            onClick={handleCopyOrderId}
            className="p-1 rounded active:opacity-70"
            aria-label="Скопировать номер заказа"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="4" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M15 20H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[24px] leading-tight font-bold text-text-primary">{title}</h1>
            {order.createdAt && (
              <p className="mt-2 text-[14px] text-text-secondary">{formatDateTime(order.createdAt)}</p>
            )}
          </div>
          {canRepeat && (
            <button
              type="button"
              onClick={handleRepeatOrder}
              className="h-9 px-4 rounded-full bg-accent text-white text-[14px] font-medium whitespace-nowrap"
            >
              Повторить
            </button>
          )}
        </div>

        <section className="mt-6 bg-[#F8F8F8] rounded-[18px] divide-y divide-border-light">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <span className="text-[14px] text-text-secondary">Адрес</span>
            <span className="text-[14px] text-text-primary text-right">{order.address || '—'}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <span className="text-[14px] text-text-secondary">Получатель</span>
            <span className="text-[14px] text-text-primary text-right">{order.customerName}{phone ? `, ${phone}` : ''}</span>
          </div>
        </section>

        <h2 className="mt-6 text-[20px] font-bold text-text-primary">Состав заказа</h2>

        <section className="mt-3 bg-[#F8F8F8] rounded-[18px] p-4">
          <div className="space-y-3">
            {order.items.map((item: OrderItem, idx: number) => (
              <div key={`${item.slug}-${idx}`} className="flex gap-3">
                <div className="w-12 h-12 rounded-[8px] bg-bg-base flex-shrink-0 overflow-hidden">
                  {productImages[item.slug] ? (
                    <img
                      src={productImages[item.slug]}
                      alt={item.title || item.slug}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary text-[10px]">Нет фото</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-tight text-text-primary line-clamp-2">{item.title || item.slug}</p>
                  <Price value={(item.priceRub || 0) * item.qty} size="sm" className="mt-1" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
            <span className="text-[15px] font-semibold text-text-primary">Итого</span>
            <Price value={order.totalRub} size="md" />
          </div>
        </section>

        {(canCancel || canReturn || showSupport) && (
          <div className={`mt-6 grid gap-2 ${(canCancel || canReturn) && showSupport ? 'grid-cols-2' : ''}`}>
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="h-12 rounded-[18px] bg-[#F8F8F8] text-[16px] font-semibold text-text-primary active:opacity-80 disabled:opacity-50"
              >
                {cancelling ? 'Отмена...' : 'Отменить заказ'}
              </button>
            )}
            {canReturn && (
              <button
                type="button"
                onClick={handleSupport}
                className="h-12 rounded-[18px] bg-[#F8F8F8] text-[16px] font-semibold text-text-primary active:opacity-80"
              >
                Вернуть заказ
              </button>
            )}
            {showSupport && (
              <button
                type="button"
                onClick={handleSupport}
                className={`h-12 rounded-[18px] bg-[#F8F8F8] text-[16px] font-semibold text-text-primary active:opacity-80 ${!(canCancel || canReturn) ? 'w-full' : ''}`}
              >
                Поддержка
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
