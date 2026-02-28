import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserOrders, getProducts, cancelOrder } from '../api'
import type { Order, OrderItem, Product } from '../api'
import { useUserStore } from '../store/user'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import toast from 'react-hot-toast'

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function formatDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' +
    date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// username менеджера для кнопки «Поддержка» — env или fallback
const SUPPORT_TG = import.meta.env.VITE_SUPPORT_TG_USERNAME || 'nikotinich_support'

export default function OrderDetailsPage() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const user = useUserStore(s => s.user)

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

  const title = useMemo(() => {
    if (!order) return 'Заказ'
    if (order.status === 'completed') return 'Заказ получен'
    return 'Заказ в пути'
  }, [order])

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
    const url = SUPPORT_TG.startsWith('http') ? SUPPORT_TG : `https://t.me/${SUPPORT_TG.replace('@', '')}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
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

  const statusSubtitle = order.status === 'completed'
    ? formatDateTime(order.createdAt)
    : `ожидается к ${formatDate(order.createdAt)}`

  const canCancel = order.status !== 'completed' && order.status !== 'cancelled'

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-32">
        {/* номер заказа с кнопкой копирования */}
        <div className="flex items-center gap-2 text-text-secondary text-[14px] mb-2">
          <span>№{order.id.slice(0, 10)}</span>
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
            <p className="mt-2 text-[14px] text-text-secondary">{statusSubtitle}</p>
          </div>
          {order.status === 'completed' && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="h-9 px-4 rounded-full bg-accent text-white text-[14px] font-medium whitespace-nowrap"
            >
              Повторить
            </button>
          )}
        </div>

        <section className="mt-6 bg-card-bg rounded-card divide-y divide-border-light">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <span className="text-[14px] text-text-secondary">Адрес</span>
            <span className="text-[14px] text-text-primary text-right">{order.address || '—'}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <span className="text-[14px] text-text-secondary">Получатель</span>
            <span className="text-[14px] text-text-primary text-right">{order.customerName}{order.phone ? `, ${order.phone}` : ''}</span>
          </div>
        </section>

        <h2 className="mt-6 text-[20px] font-bold text-text-primary">Состав заказа</h2>

        <section className="mt-3 bg-card-bg rounded-card p-4">
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
                    <div className="w-full h-full flex items-center justify-center text-text-secondary text-[10px]">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-tight text-text-primary line-clamp-2">{item.title || item.slug}</p>
                  <p className="mt-1 text-[15px] font-semibold text-text-primary">
                    {((item.priceRub || 0) * item.qty).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
            <span className="text-[15px] font-semibold text-text-primary">Итого</span>
            <span className="text-[22px] font-bold text-text-primary">{order.totalRub.toLocaleString('ru-RU')} ₽</span>
          </div>
        </section>

        <div className={`mt-6 grid gap-2 ${canCancel ? 'grid-cols-2' : ''}`}>
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="h-12 rounded-[14px] bg-card-bg text-[15px] font-semibold text-text-primary active:opacity-80 disabled:opacity-50"
            >
              {cancelling ? 'Отмена...' : 'Отменить заказ'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSupport}
            className={`h-12 rounded-[14px] bg-card-bg text-[15px] font-semibold text-text-primary active:opacity-80 ${!canCancel ? 'w-full' : ''}`}
          >
            Поддержка
          </button>
        </div>
      </div>
    </div>
  )
}
