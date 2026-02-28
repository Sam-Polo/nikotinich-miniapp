import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/user'
import { updateUser, getUserOrders, getUser } from '../api'
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
  const { user, setUser, settings } = useUserStore()

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [tab, setTab] = useState<'profile' | 'orders'>('profile')

  const [editPhone, setEditPhone] = useState(user?.phone || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [refCopied, setRefCopied] = useState(false)
  const [refModalOpen, setRefModalOpen] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  // ссылка на обработчик для последующего удаления через offEvent
  const contactHandlerRef = useRef<((data: any) => void) | null>(null)

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

  function requestPhoneFromTelegram() {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (!tg?.requestContact) {
        setPhoneError('Ваша версия Telegram не поддерживает автозаполнение')
        return
      }

      setPhoneLoading(true)
      setPhoneError('')

      // удаляем предыдущий обработчик если есть
      if (contactHandlerRef.current) {
        tg.offEvent('contactRequested', contactHandlerRef.current)
      }

      const handler = (data: any) => {
        tg.offEvent('contactRequested', handler)
        contactHandlerRef.current = null

        // определяем статус — Telegram может вернуть объект или булево
        const isSent = data?.status === 'sent' || data === true

        if (!isSent) {
          setPhoneLoading(false)
          setPhoneError('Запрос отменён')
          return
        }

        // телефон может быть прямо в event data (новые клиенты)
        const directPhone = data?.contact?.phone_number || data?.phoneNumber

        if (directPhone) {
          setEditPhone(directPhone.startsWith('+') ? directPhone : '+' + directPhone)
          setPhoneLoading(false)
          return
        }

        // телефон не пришёл в event — бот должен обновить профиль через API
        // опрашиваем с интервалом 2с до 5 раз (≈10с суммарно)
        if (!user?.telegram_id) {
          setPhoneLoading(false)
          setPhoneError('Контакт отправлен. Обновите страницу для получения номера.')
          return
        }

        let attempts = 0
        const MAX_ATTEMPTS = 5
        const tid = user.telegram_id

        const poll = () => {
          attempts++
          getUser(tid)
            .then(updated => {
              if (updated.phone) {
                setEditPhone(updated.phone)
                setUser(updated)
                setPhoneLoading(false)
              } else if (attempts < MAX_ATTEMPTS) {
                setTimeout(poll, 2000)
              } else {
                setPhoneLoading(false)
                setPhoneError('Контакт отправлен, но номер не появился. Попробуйте ещё раз.')
              }
            })
            .catch(() => {
              if (attempts < MAX_ATTEMPTS) {
                setTimeout(poll, 2000)
              } else {
                setPhoneLoading(false)
                setPhoneError('Контакт отправлен. Обновите профиль вручную.')
              }
            })
        }
        setTimeout(poll, 2000)
      }

      contactHandlerRef.current = handler
      tg.onEvent('contactRequested', handler)
      tg.requestContact()
    } catch {
      setPhoneLoading(false)
      setPhoneError('Не удалось запросить номер')
    }
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
        <PageHeader title="Никотиныч" subtitle="shop" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-10 pb-24">
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
      <PageHeader title="Никотиныч" subtitle="shop" />

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
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    className="flex-1 bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={requestPhoneFromTelegram}
                    disabled={phoneLoading}
                    className="w-10 h-10 flex items-center justify-center bg-[#2AABEE] rounded-[10px] active:opacity-80 disabled:opacity-50 flex-shrink-0"
                    title="Получить номер из Telegram"
                  >
                    {phoneLoading ? (
                      <span className="text-white text-[12px]">...</span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
                {phoneError && <p className="text-destructive text-[12px] mt-1">{phoneError}</p>}
              </div>
              <div>
                <label className="block text-[13px] text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                    placeholder="email@mail.ru"
                  className="w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
                />
              </div>
              <Button fullWidth variant={saved ? 'secondary' : 'primary'} loading={saving} onClick={handleSave}>
                {saved ? '✓ Сохранено' : 'Сохранить'}
              </Button>
            </section>

            {/* реферальная система */}
            <section className="space-y-3">
              <h2 className="text-[16px] font-semibold text-text-primary">Реферальная система</h2>

              {/* счётчик бонусных рублей */}
              {user.referral_balance_rub > 0 && (
                <div className="bg-card-bg rounded-card p-4 border border-border-light">
                  <p className="text-[14px] text-text-secondary">Бонусные рубли</p>
                  <p className="text-[24px] font-bold text-accent">₽{user.referral_balance_rub.toLocaleString('ru-RU')}</p>
                  <p className="text-[12px] text-text-secondary mt-1">Бонусы можно списать при оформлении заказа</p>
                </div>
              )}

              <div className="bg-accent rounded-[22px] p-4 border border-[#1A8FE7]">
                <p className="text-white text-[20px] leading-tight font-semibold">
                  Ваша скидка {settings?.referralPercentBefore10 ?? 5}%
                </p>

                <div className="mt-3 h-11 rounded-[12px] bg-[#1082D5] px-3 flex items-center gap-2">
                  <p className="flex-1 text-[18px] text-[#A9D5FB] truncate">{refLink}</p>
                  <button
                    onClick={copyRefLink}
                    className="text-white active:opacity-70"
                    aria-label="Скопировать ссылку"
                  >
                    {refCopied ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="4" width="11" height="14" rx="2" stroke="white" strokeWidth="2" />
                        <path d="M15 20H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="mt-4 bg-[#F3F3F3] rounded-[16px] p-3 border border-[#D8E9F9]">
                  <p className="text-[14px] text-[#575B60]">ещё 4 успешных заказа ваших друзей</p>

                  <div className="relative mt-3 h-8">
                    <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-5 rounded-full bg-[#E2E2E2]" />
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 h-5 rounded-full bg-gradient-to-r from-[#2E6EE8] to-[#6A9DF3] w-[58%]" />

                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#3C78EB] text-white text-[13px] font-semibold flex items-center justify-center">
                      {settings?.referralPercentBefore10 ?? 5}%
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#E8E8E8] text-[#3D82E7] text-[13px] font-semibold flex items-center justify-center">
                      {settings?.referralPercentAfter10 ?? 10}%
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRefModalOpen(true)}
                className="w-full text-center text-accent text-[15px] font-semibold active:opacity-70"
              >
                Как это работает?
              </button>
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
              <button
                key={order.id}
                type="button"
                onClick={() => navigate(`/order/${order.id}`)}
                className="w-full text-left bg-card-bg rounded-card p-4 active:opacity-85 transition-opacity"
              >
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
              </button>
            ))}
          </div>
        )}
      </div>

      {/* модалка «Как это работает» — инфо о рефералке из админки */}
      {refModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center justify-center" onClick={() => setRefModalOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-text-primary mb-4">Как работает реферальная система</h3>
            <div className="text-[14px] text-text-secondary space-y-3 leading-relaxed">
              <p>Делитесь реферальной ссылкой с друзьями. Новые пользователи, перешедшие по ссылке, привязываются к вам как рефералы.</p>
              <p>За каждый подтверждённый заказ реферала вы получаете бонус на реф. баланс. Подтверждение заказа — смена статуса на «Подтверждён» в разделе заказов.</p>
              <p>Процент бонуса зависит от количества уже подтверждённых заказов всех ваших рефералов:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>до 10 заказов — {settings?.referralPercentBefore10 ?? 5}%</li>
                <li>с 11-го заказа — {settings?.referralPercentAfter10 ?? 10}%</li>
              </ul>
              <p>Бонус = сумма заказа × процент / 100.</p>
              <p>Реф. баланс можно списать при оформлении заказа в корзине.</p>
            </div>
            <button
              type="button"
              onClick={() => setRefModalOpen(false)}
              className="mt-6 w-full py-3 bg-accent text-white rounded-[12px] font-semibold text-[15px]"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
