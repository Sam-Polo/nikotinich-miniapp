import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useUserStore } from '../store/user'
import { createOrder } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart, promoApplied, referralBonusUsed } = useCartStore()
  const { user, settings } = useUserStore()

  const [name, setName] = useState(user?.username || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addressError, setAddressError] = useState('')

  const deliveryFee = settings?.deliveryFee ?? 300
  const freeFrom = settings?.freeDeliveryFrom ?? 3500
  const sub = subtotal()
  const isFree = sub >= freeFrom
  const delivery = isFree ? 0 : deliveryFee
  const totalBeforeDiscount = sub + delivery
  const promoDiscount = promoApplied?.discount ?? 0
  const afterPromo = Math.max(0, totalBeforeDiscount - promoDiscount)
  const effectiveBonus = Math.min(referralBonusUsed, afterPromo)
  const total = Math.max(0, afterPromo - effectiveBonus)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAddressError('')
    if (!name.trim()) { setError('Введите ваше имя'); return }
    if (!address.trim()) { setAddressError('Укажите адрес доставки'); return }
    setError('')
    setLoading(true)
    try {
      const orderItems = items.map(i => ({
        slug: i.product.slug,
        qty: i.qty,
        title: i.product.title,
        priceRub: i.product.display_price
      }))

      const result = await createOrder({
        customerName: name.trim(),
        items: orderItems,
        userId: user?.telegram_id,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        totalRub: total,
        deliveryFee: delivery,
        promoCode: promoApplied?.code || undefined,
        note: note.trim() || undefined,
        referralBonusUsed: effectiveBonus > 0 ? effectiveBonus : undefined
      })

      clearCart()
      navigate(`/order-success/${result.id}`)
    } catch {
      setError('Не удалось оформить заказ. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="shop" showBack />

      <form onSubmit={handleSubmit} className="flex-1 px-4 pt-4 pb-36">
        <h1 className="text-[28px] font-bold text-text-primary mb-6">Оформить заказ</h1>

        {/* данные покупателя */}
        <section className="bg-card-bg rounded-card p-4 mb-4 space-y-4">
          <h2 className="text-[16px] font-semibold text-text-primary">Контактные данные</h2>
          <Field label="Имя *" value={name} onChange={setName} placeholder="Ваше имя" />
          <Field label="Телефон" value={phone} onChange={setPhone} placeholder="+7 (___) ___-__-__" type="tel" />
        </section>

        {/* доставка */}
        <section className="bg-card-bg rounded-card p-4 mb-4 space-y-4">
          <h2 className="text-[16px] font-semibold text-text-primary">Доставка</h2>
          <div>
            <label className="block text-[13px] text-text-secondary mb-1">Адрес *</label>
            <input
              type="text"
              value={address}
              onChange={e => { setAddress(e.target.value); setAddressError('') }}
              placeholder="Москва, ул. Примерная, д. 1"
              className={`w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border ${addressError ? 'border-red-500' : 'border-border-light'} focus:border-accent`}
            />
            {addressError && <p className="text-destructive text-[13px] mt-1">{addressError}</p>}
          </div>
        </section>

        {/* комментарий */}
        <section className="bg-card-bg rounded-card p-4 mb-4">
          <label className="block text-[13px] text-text-secondary mb-1">Комментарий к заказу</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Любые пожелания..."
            rows={3}
            className="w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent resize-none"
          />
        </section>

        {/* итоги */}
        <section className="bg-card-bg rounded-card p-4 space-y-2 mb-4">
          <div className="flex justify-between text-[14px] text-text-secondary">
            <span>Товары ({items.reduce((s, i) => s + i.qty, 0)} шт.)</span>
            <span>₽{sub.toLocaleString('ru-RU')}</span>
          </div>
          <div className="flex justify-between text-[14px] text-text-secondary">
            <span>Доставка</span>
            <span className={isFree ? 'text-green-500' : ''}>{isFree ? 'Бесплатно' : `₽${delivery}`}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-[14px] text-green-500">
              <span>Промокод {promoApplied?.code}</span>
              <span>−₽{promoDiscount.toLocaleString('ru-RU')}</span>
            </div>
          )}
          {effectiveBonus > 0 && (
            <div className="flex justify-between text-[14px] text-green-500">
              <span>Реферальные баллы</span>
              <span>−₽{effectiveBonus.toLocaleString('ru-RU')}</span>
            </div>
          )}
          <div className="flex justify-between text-[17px] font-bold text-text-primary border-t border-border-light pt-2 mt-1">
            <span>Итого</span>
            <span>₽{total.toLocaleString('ru-RU')}</span>
          </div>
        </section>

        {error && <p className="text-destructive text-[14px] mb-3">{error}</p>}
      </form>

      {/* кнопка подтверждения — выше BottomNav */}
      <div className="fixed left-0 right-0 bg-white border-t border-border-light px-4 py-3 z-[60]"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button fullWidth loading={loading} onClick={handleSubmit as any}>
          Подтвердить заказ — ₽{total.toLocaleString('ru-RU')}
        </Button>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text'
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[13px] text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-base rounded-[10px] px-3 py-2 text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
      />
    </div>
  )
}
