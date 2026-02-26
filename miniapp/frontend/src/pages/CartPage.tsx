import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useUserStore } from '../store/user'
import { validatePromo } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

export default function CartPage() {
  const navigate = useNavigate()
  const { items, removeItem, updateQty, subtotal, promoApplied, applyPromo, clearPromo, referralBonusUsed, applyReferralBonus, clearReferralBonus } = useCartStore()
  const { user, settings } = useUserStore()

  const deliveryFee = settings?.deliveryFee ?? 300
  const freeFrom = settings?.freeDeliveryFrom ?? 3500
  const sub = subtotal()
  const isFreeDelivery = sub >= freeFrom
  const delivery = isFreeDelivery ? 0 : deliveryFee
  const totalBeforeDiscount = sub + delivery

  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const referralBalance = user?.referral_balance_rub ?? 0

  const promoDiscount = promoApplied?.discount ?? 0
  // итого после промокода, до реферального баланса
  const afterPromo = Math.max(0, totalBeforeDiscount - promoDiscount)
  // применённый реферальный бонус не может превышать итог после промокода
  const effectiveReferralBonus = Math.min(referralBonusUsed, afterPromo)
  const finalTotal = Math.max(0, afterPromo - effectiveReferralBonus)

  async function applyPromoCode() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const slugs = items.map(i => i.product.slug)
      // сначала делаем запрос чтобы узнать productSlugs промокода
      const result = await validatePromo(promoInput.trim(), totalBeforeDiscount, slugs)

      let finalDiscount = result.discount
      // для percent-промокодов с ограничением по товарам: пересчитываем от eligible subtotal
      if (result.type === 'percent' && result.productSlugs && result.productSlugs.length > 0) {
        const eligibleSubtotal = items
          .filter(i => result.productSlugs.includes(i.product.slug))
          .reduce((s, i) => s + i.product.display_price * i.qty, 0)
        finalDiscount = Math.round(eligibleSubtotal * result.value / 100)
      }

      applyPromo({ code: promoInput.trim().toUpperCase(), discount: finalDiscount, productSlugs: result.productSlugs })
    } catch (e: any) {
      const msg = e.message
      setPromoError(
        msg === 'invalid_code' ? 'Промокод не найден' :
        msg === 'expired_code' ? 'Промокод истёк' :
        msg === 'not_applicable' ? 'Промокод не действует на товары в корзине' :
        'Ошибка проверки'
      )
    } finally {
      setPromoLoading(false)
    }
  }

  function toggleReferralBonus() {
    if (referralBonusUsed > 0) {
      clearReferralBonus()
    } else if (referralBalance > 0) {
      // применяем столько, сколько нужно для оплаты (не больше баланса)
      applyReferralBonus(Math.min(referralBalance, afterPromo))
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
                <button
                  onClick={() => removeItem(product.slug)}
                  className="text-destructive text-[20px] leading-none"
                >
                  ×
                </button>
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
        <div className="bg-card-bg rounded-card p-4 mb-3">
          <p className="text-[14px] font-semibold text-text-primary mb-2">Промокод</p>
          {promoApplied ? (
            <div className="flex items-center justify-between">
              <p className="text-accent text-[14px]">🎉 {promoApplied.code} — −₽{promoApplied.discount.toLocaleString('ru-RU')}</p>
              <button onClick={() => { clearPromo(); setPromoInput('') }} className="text-destructive text-[13px]">
                Убрать
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Введите промокод"
                className="flex-1 px-3 py-2 bg-bg-base rounded-[10px] text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
              />
              <Button
                variant="secondary"
                loading={promoLoading}
                onClick={applyPromoCode}
                className="px-4 py-2 text-[14px]"
              >
                Применить
              </Button>
            </div>
          )}
          {promoError && <p className="text-destructive text-[12px] mt-1">{promoError}</p>}
        </div>

        {/* реферальный баланс */}
        {referralBalance > 0 && (
          <div className="bg-card-bg rounded-card p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-text-primary">Реферальные баллы</p>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  Доступно: ₽{referralBalance.toLocaleString('ru-RU')}
                </p>
              </div>
              <button
                onClick={toggleReferralBonus}
                className={`w-12 h-7 rounded-full transition-colors duration-200 relative ${effectiveReferralBonus > 0 ? 'bg-accent' : 'bg-border-light'}`}
              >
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${effectiveReferralBonus > 0 ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {effectiveReferralBonus > 0 && (
              <p className="text-accent text-[13px] mt-2">−₽{effectiveReferralBonus.toLocaleString('ru-RU')} баллами</p>
            )}
          </div>
        )}

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
          {promoDiscount > 0 && (
            <div className="flex justify-between text-[14px] text-green-500">
              <span>Промокод</span>
              <span>−₽{promoDiscount.toLocaleString('ru-RU')}</span>
            </div>
          )}
          {effectiveReferralBonus > 0 && (
            <div className="flex justify-between text-[14px] text-green-500">
              <span>Реферальные баллы</span>
              <span>−₽{effectiveReferralBonus.toLocaleString('ru-RU')}</span>
            </div>
          )}
          <div className="flex justify-between text-[17px] font-bold text-text-primary border-t border-border-light pt-2 mt-1">
            <span>Итого</span>
            <span>₽{finalTotal.toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* кнопка оформить заказ — z-[60] чтобы перекрывать BottomNav (z-50) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 pb-safe z-[60]">
        <Button fullWidth onClick={() => navigate('/checkout')}>
          Оформить заказ — ₽{finalTotal.toLocaleString('ru-RU')}
        </Button>
      </div>
    </div>
  )
}
