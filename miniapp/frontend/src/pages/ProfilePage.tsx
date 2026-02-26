import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/user'
import { updateUser, getUserOrders } from '../api'
import type { Order } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Spinner from '../components/Spinner'

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  packed: 'Собирается',
  completed: 'Выполнен',
  cancelled: 'Отменён'
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  new: 'text-yellow-600 bg-yellow-50',
  confirmed: 'text-blue-600 bg-blue-50',
  packed: 'text-purple-600 bg-purple-50',
  completed: 'text-green-600 bg-green-50',
  cancelled: 'text-red-600 bg-red-50'
}

// реферальная ссылка (bot username захардкожен — можно добавить в env)
function buildRefLink(telegramId: string) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'nikotinich_bot'
  return `https://t.me/${botUsername}?startapp=ref_${telegramId}`
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser } = useUserStore()

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [tab, setTab] = useState<'profile' | 'orders'>('profile')

  const [editPhone, setEditPhone] = useState(user?.phone || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [refCopied, setRefCopied] = useState(false)

  useEffect(() => {
    if (tab === 'orders' && user?.telegram_id) {
      setOrdersLoading(true)
      getUserOrders(user.telegram_id)
        .then(setOrders)
        .catch(() => {})
        .finally(() => setOrdersLoading(false))
    }
  }, [tab, user?.telegram_id])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const updated = await updateUser(user.telegram_id, { phone: editPhone.trim(), email: editEmail.trim() })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ошибка — не сохраняем */ }
    finally { setSaving(false) }
  }

  function copyRefLink() {
    if (!user) return
    const link = buildRefLink(user.telegram_id)
    navigator.clipboard.writeText(link).then(() => {
      setRefCopied(true)
      setTimeout(() => setRefCopied(false), 2000)
    })
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pb-24">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mb-4 opacity-30">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="7" r="4" stroke="#8E8E93" strokeWidth="2" />
          </svg>
          <p className="text-text-secondary text-[16px]">Профиль недоступен</p>
          <p className="text-text-secondary text-[13px] mt-1 opacity-60">Откройте приложение через Telegram</p>
        </div>
      </div>
    )
  }

  const refLink = buildRefLink(user.telegram_id)

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 pb-24">
        <div className="px-4 pt-4 mb-4">
          <h1 className="text-[28px] font-bold text-text-primary">Профиль</h1>
        </div>

        {/* аватар и имя */}
        <div className="flex items-center gap-4 px-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white text-[22px] font-bold flex-shrink-0">
            {(user.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[18px] font-semibold text-text-primary">{user.username || 'Пользователь'}</p>
            <p className="text-[13px] text-text-secondary">ID: {user.telegram_id}</p>
          </div>
        </div>

        {/* вкладки */}
        <div className="flex px-4 gap-2 mb-4">
          {(['profile', 'orders'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'flex-1 py-2 rounded-[10px] text-[14px] font-semibold transition-colors',
                tab === t ? 'bg-accent text-white' : 'bg-card-bg text-text-secondary'
              ].join(' ')}
            >
              {t === 'profile' ? 'Настройки' : 'Мои заказы'}
            </button>
          ))}
        </div>

        {/* вкладка профиль */}
        {tab === 'profile' && (
          <div className="px-4 space-y-4">
            <section className="bg-card-bg rounded-card p-4 space-y-4">
              <h2 className="text-[16px] font-semibold text-text-primary">Контактные данные</h2>
              <div>
                <label className="block text-[13px] text-text-secondary mb-1">Телефон</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[13px] text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
                />
              </div>
              <Button fullWidth variant={saved ? 'secondary' : 'primary'} loading={saving} onClick={handleSave}>
                {saved ? '✓ Сохранено' : 'Сохранить'}
              </Button>
            </section>

            {/* реферальная система */}
            <section className="bg-card-bg rounded-card p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-[16px] font-semibold text-text-primary">Реферальная программа</h2>
                  <p className="text-[13px] text-text-secondary mt-0.5">Приглашайте друзей и получайте бонусы</p>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-bold text-accent">₽{user.referral_balance_rub.toLocaleString('ru-RU')}</p>
                  <p className="text-[11px] text-text-secondary">реф. баланс</p>
                </div>
              </div>

              {/* ссылка */}
              <div className="bg-bg-base rounded-[10px] px-3 py-2 flex items-center gap-2">
                <p className="flex-1 text-[12px] text-text-secondary truncate font-mono">{refLink}</p>
                <button
                  onClick={copyRefLink}
                  className="text-accent text-[13px] font-semibold flex-shrink-0"
                >
                  {refCopied ? '✓' : 'Копировать'}
                </button>
              </div>

              <Button fullWidth variant="secondary" onClick={copyRefLink}>
                Поделиться ссылкой
              </Button>
            </section>
          </div>
        )}

        {/* вкладка заказы */}
        {tab === 'orders' && (
          <div className="px-4 space-y-3">
            {ordersLoading && <Spinner />}
            {!ordersLoading && orders.length === 0 && (
              <div className="text-center mt-10">
                <p className="text-text-secondary text-[16px]">Заказов пока нет</p>
                <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
                  В каталог
                </Button>
              </div>
            )}
            {orders.map(order => (
              <div key={order.id} className="bg-card-bg rounded-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[13px] font-mono text-text-secondary">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[12px] text-text-secondary">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status] || 'text-text-secondary bg-bg-base'}`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <p className="text-[13px] text-text-secondary mb-2">
                  {order.items.map(i => `${i.title || i.slug} × ${i.qty}`).join(', ')}
                </p>
                <p className="text-[16px] font-bold text-text-primary">
                  ₽{order.totalRub.toLocaleString('ru-RU')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
