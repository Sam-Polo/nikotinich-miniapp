import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useUserStore } from '../store/user'
import { validatePromo } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

export default function CartPage() {
  const navigate = useNavigate()
  const { items, removeItem, updateQty, subtotal } = useCartStore()
  const { settings } = useUserStore()

  const deliveryFee = settings?.deliveryFee ?? 300
  const freeFrom = settings?.freeDeliveryFrom ?? 3500
  const sub = subtotal()
  const isFreeDelivery = sub >= freeFrom
  const delivery = isFreeDelivery ? 0 : deliveryFee
  const total = sub + delivery

  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const finalTotal = total - (promoApplied?.discount ?? 0)

  async function applyPromo() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const result = await validatePromo(promoInput.trim(), total)
      setPromoApplied({ code: promoInput.trim().toUpperCase(), discount: result.discount })
    } catch (e: any) {
      setPromoError(e.message === 'invalid_code' ? 'Промокод не найден' : e.message === 'expired_code' ? 'Промокод истёк' : 'Ошибка проверки')
    } finally {
      setPromoLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pb-24">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mb-4 opacity-30">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-text-secondary text-[16px]">Корзина пуста</p>
          <p className="text-text-secondary text-[14px] mt-1 opacity-60">Выберите товары в каталоге</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
            Перейти в каталог
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 px-4 pt-4 pb-40">
        <h1 className="text-[28px] font-bold text-text-primary mb-4">Корзина</h1>

        {/* список товаров */}
        <div className="space-y-3 mb-4">
          {items.map(({ product, qty }) => (
            <div key={product.slug} className="bg-card-bg rounded-card p-4 flex gap-3">
              {product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-16 h-16 object-contain rounded-xl bg-bg-base flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-primary line-clamp-2 mb-1">{product.title}</p>
                <p className="text-[14px] font-bold text-text-primary">
                  ₽{(product.display_price * qty).toLocaleString('ru-RU')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* кнопка удалить */}
                <button
                  onClick={() => removeItem(product.slug)}
                  className="text-destructive text-[20px] leading-none"
                >
                  ×
                </button>
                {/* счётчик */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(product.slug, qty - 1)}
                    className="w-7 h-7 rounded-full bg-bg-base text-text-primary text-[18px] flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-[15px] font-semibold">{qty}</span>
                  <button
                    onClick={() => updateQty(product.slug, qty + 1)}
                    className="w-7 h-7 rounded-full bg-accent text-white text-[18px] flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* промокод */}
        <div className="bg-card-bg rounded-card p-4 mb-4">
          <p className="text-[14px] font-semibold text-text-primary mb-2">Промокод</p>
          {promoApplied ? (
            <div className="flex items-center justify-between">
              <p className="text-accent text-[14px]">🎉 {promoApplied.code} — −₽{promoApplied.discount}</p>
              <button onClick={() => { setPromoApplied(null); setPromoInput('') }} className="text-destructive text-[13px]">
                Убрать
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value)}
                placeholder="Введите промокод"
                className="flex-1 px-3 py-2 bg-bg-base rounded-[10px] text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
              />
              <Button
                variant="secondary"
                loading={promoLoading}
                onClick={applyPromo}
                className="px-4 py-2 text-[14px]"
              >
                Применить
              </Button>
            </div>
          )}
          {promoError && <p className="text-destructive text-[12px] mt-1">{promoError}</p>}
        </div>

        {/* итоговая сумма */}
        <div className="bg-card-bg rounded-card p-4 space-y-2">
          <div className="flex justify-between text-[14px] text-text-secondary">
            <span>Товары</span>
            <span>₽{sub.toLocaleString('ru-RU')}</span>
          </div>
          <div className="flex justify-between text-[14px] text-text-secondary">
            <span>Доставка</span>
            <span className={isFreeDelivery ? 'text-green-500 font-medium' : ''}>
              {isFreeDelivery ? 'Бесплатно' : `₽${delivery}`}
            </span>
          </div>
          {!isFreeDelivery && (
            <p className="text-[12px] text-text-secondary opacity-60">
              Бесплатная доставка от ₽{freeFrom.toLocaleString('ru-RU')}
            </p>
          )}
          {promoApplied && (
            <div className="flex justify-between text-[14px] text-green-500">
              <span>Скидка</span>
              <span>−₽{promoApplied.discount}</span>
            </div>
          )}
          <div className="flex justify-between text-[17px] font-bold text-text-primary border-t border-border-light pt-2 mt-1">
            <span>Итого</span>
            <span>₽{Math.max(0, finalTotal).toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* кнопка оформить заказ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 pb-safe">
        <Button
          fullWidth
          onClick={() => navigate('/checkout')}
        >
          Оформить заказ
        </Button>
      </div>
    </div>
  )
}
