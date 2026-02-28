import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserOrders } from '../api'
import type { Order } from '../api'
import { useUserStore } from '../store/user'
import Spinner from '../components/Spinner'

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

export default function OrderDetailsPage() {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const user = useUserStore(s => s.user)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (!user?.telegram_id || !orderId) {
      setLoading(false)
      return
    }

    setLoading(true)
    getUserOrders(user.telegram_id)
      .then(list => {
        const found = list.find(o => o.id === orderId) ?? null
        setOrder(found)
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [user?.telegram_id, orderId])

  const title = useMemo(() => {
    if (!order) return 'Заказ'
    if (order.status === 'completed') return 'Заказ получен'
    return 'Заказ в пути'
  }, [order])

  if (loading) {
    return (
      <div className="min-h-full bg-bg-base">
        <Spinner />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-full bg-bg-base px-4 pt-8">
        <button onClick={() => navigate(-1)} className="text-accent text-[16px]">Back</button>
        <p className="mt-10 text-text-secondary text-center">Заказ не найден</p>
      </div>
    )
  }

  const statusSubtitle = order.status === 'completed'
    ? formatDateTime(order.createdAt)
    : `ожидается к ${formatDate(order.createdAt)}`

  return (
    <div className="min-h-full bg-bg-base px-4 pt-2 pb-8">
      {/* верхняя панель как в макете */}
      <div className="relative h-14 flex items-center">
        <button onClick={() => navigate(-1)} className="text-accent text-[16px] leading-none flex items-center gap-1">
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M9 1L1 8.5L9 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <p className="text-[16px] leading-tight font-semibold text-text-primary">Никотиныч</p>
          <p className="text-[12px] leading-tight text-text-secondary">mini app</p>
        </div>
        <div className="ml-auto">
          <button className="w-7 h-7 rounded-full border border-accent text-accent flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="7" r="1.25" fill="currentColor" />
              <circle cx="7" cy="7" r="1.25" fill="currentColor" />
              <circle cx="11" cy="7" r="1.25" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-1 text-[#95979B] text-[14px]">
          <span>№{order.id.slice(0, 10)}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="4" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M15 20H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[40px] leading-none font-bold text-[#35363A]">{title}</h1>
            <p className="mt-2 text-[14px] text-[#5D6066]">{statusSubtitle}</p>
          </div>
          {order.status === 'completed' && (
            <button className="h-9 px-4 rounded-full bg-accent text-white text-[14px] font-medium whitespace-nowrap">
              Повторить
            </button>
          )}
        </div>
      </div>

      <section className="mt-6 bg-[#F0F0F1] rounded-[16px] divide-y divide-[#E5E5E7]">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-[16px] text-[#45474D]">Адрес</span>
          <span className="text-[16px] text-[#6B6E74] text-right">{order.address || '—'}</span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-[16px] text-[#45474D]">Получатель</span>
          <span className="text-[16px] text-[#6B6E74] text-right">{order.customerName}{order.phone ? `, ${order.phone}` : ''}</span>
        </div>
        <button className="w-full px-4 py-3 flex items-center justify-between text-left">
          <span className="text-[16px] text-[#45474D]">Чек</span>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="text-[#1F2125]">
            <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      <h2 className="mt-6 text-[40px] leading-none font-bold text-[#35363A]">Состав заказа</h2>

      <section className="mt-3 bg-[#F0F0F1] rounded-[16px] p-4">
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={`${item.slug}-${idx}`} className="flex gap-3">
              <div className="w-12 h-12 rounded-[8px] bg-[#E6E6E8] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-tight text-[#606269] line-clamp-2">{item.title || item.slug}</p>
                <p className="mt-1 text-[16px] font-semibold text-[#34353A]">
                  {((item.priceRub || 0) * item.qty).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[#E3E3E5] flex items-center justify-between">
          <span className="text-[16px] font-semibold text-[#484A50]">Итого</span>
          <span className="text-[34px] leading-none font-bold text-[#3C3E44]">{order.totalRub.toLocaleString('ru-RU')} ₽</span>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button className="h-12 rounded-[14px] bg-[#F0F0F1] text-[16px] font-semibold text-[#46484E]">
          {order.status === 'completed' ? 'Вернуть заказ' : 'Отменить заказ'}
        </button>
        <button className="h-12 rounded-[14px] bg-[#F0F0F1] text-[16px] font-semibold text-[#46484E]">
          Поддержка
        </button>
      </div>
    </div>
  )
}
