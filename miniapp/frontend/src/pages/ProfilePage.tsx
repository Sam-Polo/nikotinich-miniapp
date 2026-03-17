import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/user'
import { updateUser, getUserOrders, getUser, getProducts } from '../api'
import type { Order, Product } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Price from '../components/Price'
import { OrderListSkeleton } from '../components/Skeleton'
import BottomSheet from '../components/BottomSheet'

function getOrderTitleByStatus(status: string) {
  const s = String(status || '').toLowerCase()
  if (s === 'confirmed') return 'Подтверждён'
  if (s === 'packed') return 'Заказ в пути'
  if (s === 'completed') return 'Завершён'
  if (s === 'cancelled') return 'Отменён'
  return 'Новый'
}

function formatOrderDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function formatPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  let d = digits
  if (d.length === 11 && d.startsWith('8')) {
    d = '7' + d.slice(1)
  } else if (d.length === 10) {
    d = '7' + d
  } else if (d.length < 11) {
    d = d.padStart(11, '7')
  } else if (d.length > 11) {
    d = d.slice(-11)
  }
  const country = '+7'
  const p1 = d.slice(1, 4)
  const p2 = d.slice(4, 7)
  const p3 = d.slice(7, 9)
  const p4 = d.slice(9, 11)
  return `${country} ${p1} ${p2}-${p3}-${p4}`
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
  const [orderProductImages, setOrderProductImages] = useState<Record<string, string>>({})
  const [ordersLoading, setOrdersLoading] = useState(false)

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
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [editName, setEditName] = useState(user?.username || '')

  const formattedPhone = formatPhone(editPhone || user?.phone || '')

  useEffect(() => {
    if (!user?.telegram_id) return
    let cancelled = false

    setOrdersLoading(true)
    getUserOrders(user.telegram_id)
      .then(async (list) => {
        if (cancelled) return
        setOrders(list)

        const slugs = Array.from(new Set(list.flatMap(o => o.items.map(i => i.slug).filter(Boolean))))
        if (!slugs.length) {
          setOrderProductImages({})
          return
        }
        try {
          const products = await getProducts({ slugs })
          if (cancelled) return
          const map: Record<string, string> = {}
          products.forEach((p: Product) => {
            if (p.images?.[0]) map[p.slug] = p.images[0]
          })
          setOrderProductImages(map)
        } catch {
          if (!cancelled) setOrderProductImages({})
        }
      })
      .catch(() => {
        if (!cancelled) setOrders([])
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.telegram_id])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload: { phone?: string; email?: string; username?: string } = {}
      if (editPhone.trim()) payload.phone = formatPhone(editPhone)
      if (editEmail.trim()) payload.email = editEmail.trim()
      if (editName.trim()) payload.username = editName.trim()
      const updated = await updateUser(user.telegram_id, payload)
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
        <PageHeader title="Никотиныч" subtitle="mini app" />
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
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 pb-24">
        <div className="px-4 pt-4 mb-4">
          <h1 className="text-[28px] font-bold text-text-primary">Профиль</h1>
        </div>

        {/* блок профиля как на макете */}
        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className="mx-4 mb-5 w-[calc(100%-2rem)] flex items-center gap-4 bg-[#F4F5F7] rounded-[18px] px-4 py-3 active:opacity-80"
        >
          <div className="w-16 h-16 rounded-[18px] bg-[#F8F8F8] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <path d="M32 64C49.5464 64 64 49.5533 64 32.0153C64 14.4773 49.5158 0 32 0C14.4536 0 0 14.4773 0 32.0153C0 49.5533 14.4536 64 32 64ZM32 42.6973C23.7627 42.6973 17.3627 45.605 14.0249 49.1248C9.79904 44.6868 7.22679 38.6571 7.22679 32.0153C7.22679 18.2726 18.2201 7.19273 32 7.19273C45.7493 7.19273 56.8038 18.2726 56.8345 32.0153C56.8345 38.6571 54.2316 44.6868 50.0057 49.1248C46.6679 45.605 40.2679 42.6973 32 42.6973ZM32 37.8307C37.9713 37.8613 42.5952 32.7805 42.5952 26.2305C42.5952 20.0478 37.91 14.8446 32 14.8446C26.09 14.8446 21.3742 20.0478 21.4354 26.2305C21.4354 32.7805 26.0593 37.8001 32 37.8307Z" fill="#D4D4D4" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[16px] font-semibold text-text-primary">
              {editName || user.username || 'Пользователь'}
            </p>
            {formattedPhone ? (
              <p className="text-[13px] text-text-secondary mt-0.5">{formattedPhone}</p>
            ) : (
              <p className="text-[13px] text-text-secondary mt-0.5 opacity-70">Добавьте телефон</p>
            )}
          </div>
          <svg
            className="w-5 h-5 text-border-light flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="px-4 space-y-4">
            {/* реферальная система */}
            {/* реферальная система */}
            <section className="space-y-3">
              <h2 className="text-[16px] font-semibold text-text-primary">Реферальная система</h2>

              {/* счётчик бонусных рублей (без рамки) */}
              {user.referral_balance_rub > 0 && (
                <div className="bg-card-bg rounded-card p-4">
                  <p className="text-[14px] text-text-secondary">Бонусные рубли</p>
                  <Price value={user.referral_balance_rub} size="md" className="text-accent" />
                  <p className="text-[12px] text-text-secondary mt-1">Бонусы можно списать при оформлении заказа</p>
                </div>
              )}

              <div className="bg-accent rounded-[22px] p-4 border border-[#1A8FE7]">
                <p className="text-white text-[20px] leading-tight font-semibold">
                  Ваша скидка {settings?.referralPercentBefore10 ?? 3}%
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

                {/* шкала 0–10 заказов: проценты из настроек, прогресс из referral_confirmed_orders_count */}
                {(() => {
                  const count = Math.min(10, user.referral_confirmed_orders_count ?? 0)
                  const remaining = Math.max(0, 10 - count)
                  const percentLeft = settings?.referralPercentBefore10 ?? 3
                  const percentRight = settings?.referralPercentAfter10 ?? 5
                  const progressPercent = (count / 10) * 100
                  return (
                    <div className="mt-4 bg-[#F3F3F3] rounded-[16px] p-3 border border-[#D8E9F9]">
                      <p className="text-[14px] text-[#575B60]">
                        {remaining > 0
                          ? `ещё ${remaining} успешных заказов ваших друзей`
                          : 'до 10 заказов достигнуто — ваша скидка выросла'}
                      </p>

                      <div className="relative mt-3 h-8">
                        <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-5 rounded-full bg-[#E2E2E2]" />
                        <div
                          className="absolute left-1 top-1/2 -translate-y-1/2 h-5 rounded-full bg-gradient-to-r from-[#2E6EE8] to-[#6A9DF3] transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />

                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#3C78EB] text-white text-[13px] font-semibold flex items-center justify-center">
                          {percentLeft}%
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#E8E8E8] text-[#3D82E7] text-[13px] font-semibold flex items-center justify-center">
                          {percentRight}%
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <button
                type="button"
                onClick={() => setRefModalOpen(true)}
                className="w-full text-center text-accent text-[15px] font-semibold active:opacity-70"
              >
                Как это работает?
              </button>
            </section>
            <section className="pt-1">
              <h2 className="text-[20px] font-bold leading-[120%] text-[#343434]">История заказов</h2>

              {ordersLoading && (
                <OrderListSkeleton />
              )}

              {!ordersLoading && orders.length === 0 && (
                <div className="text-center mt-6 pb-6">
                  <p className="text-text-secondary text-[16px]">Заказов пока нет</p>
                  <Button variant="ghost" className="mt-3" onClick={() => navigate('/')}>
                    В каталог
                  </Button>
                </div>
              )}

              {!ordersLoading && orders.length > 0 && (
                <div className="mt-4 space-y-5">
                  {orders.map((order, i) => {
                    const previewItems = order.items.slice(0, 2)
                    const orderTitle = getOrderTitleByStatus(order.status)
                    const dateLabel = formatOrderDate(order.createdAt)
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="animate-stagger-in w-full text-left bg-[#F8F8F8] rounded-[18px] p-[18px] active:scale-[0.99] transition-transform duration-150 ease-out"
                        style={{ ['--stagger-i' as string]: `${i * 45}ms` }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold leading-[120%] text-[#434343]">{orderTitle}</p>
                            <p className="text-[12px] font-normal leading-[14px] text-[#626262] truncate">
                              {order.address || dateLabel || '—'}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-[#595959] flex-shrink-0" viewBox="0 0 24 24" fill="none">
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>

                        <div className="mt-3 space-y-[10px]">
                          {previewItems.map((item, idx) => (
                            <div key={`${order.id}-${item.slug}-${idx}`} className="flex items-center gap-[10px]">
                              <div className="w-[50px] h-[50px] rounded-[8px] bg-[#E7E7E7] overflow-hidden flex-shrink-0">
                                {orderProductImages[item.slug] ? (
                                  <img
                                    src={orderProductImages[item.slug]}
                                    alt={item.title || item.slug}
                                    className="w-full h-full object-contain p-1 mix-blend-multiply"
                                  />
                                ) : null}
                              </div>
                              <p className="text-[12px] font-medium leading-[110%] text-[#626262] line-clamp-2">
                                {item.title || item.slug}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* нижний статус и цена убраны по требованию — статус уже в заголовке */}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
        </div>
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
                <li>до 10 заказов — {settings?.referralPercentBefore10 ?? 3}%</li>
                <li>с 11-го заказа — {settings?.referralPercentAfter10 ?? 5}%</li>
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

      {/* модалка редактирования профиля — через общий BottomSheet с анимацией */}
      <BottomSheet
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        snapHeight="70vh"
      >
        <div className="px-4 pt-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[18px] font-bold text-text-primary">Контактные данные</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] text-text-secondary mb-1">Имя</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Имя и фамилия"
                className="w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[13px] text-text-secondary mb-1">Телефон</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={formatPhone(editPhone)}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="+7 905 129-72-33"
                  className="flex-1 bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
                />
                <button
                  type="button"
                  onClick={requestPhoneFromTelegram}
                  disabled={phoneLoading}
                  className="w-10 h-10 flex items-center justify-center bg-accent rounded-[10px] active:opacity-80 disabled:opacity-50 flex-shrink-0"
                  title="получить номер из telegram"
                >
                  {phoneLoading ? (
                    <span className="text-white text-[12px]">...</span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <circle cx="12" cy="8" r="3" />
                      <path d="M6 18c0-3.5 2.5-5 6-5s6 1.5 6 5" />
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
          </div>

          <div className="mt-5 space-y-2">
            <Button
              fullWidth
              variant={saved ? 'secondary' : 'primary'}
              loading={saving}
              onClick={async () => {
                await handleSave()
                setProfileModalOpen(false)
              }}
            >
              {saved ? '✓ сохранено' : 'Сохранить'}
            </Button>
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="w-full text-center text-[14px] text-text-secondary mt-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
