import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useCartStore, type CartItem } from '../store/cart'
import { useUserStore } from '../store/user'
import { validatePromo } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

type CartItemRowProps = {
  item: CartItem
  onUpdateQty: (slug: string, qty: number) => void
  onRemove: (slug: string) => void
}

function CartItemRow({ item, onUpdateQty, onRemove }: CartItemRowProps) {
  const { product, qty } = item
  const stock = product.stock
  const canInc = stock == null || qty < stock
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef<number | null>(null)
  const maxOffset = 96

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return
    const touchX = e.touches[0].clientX
    startXRef.current = touchX - offsetX
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragging || startXRef.current == null) return
    const touchX = e.touches[0].clientX
    let next = touchX - startXRef.current
    if (next > 0) next = 0
    if (next < -maxOffset) next = -maxOffset
    setOffsetX(next)
  }

  const handleTouchEnd = () => {
    if (!dragging) return
    const shouldOpen = offsetX <= -maxOffset / 2
    setOffsetX(shouldOpen ? -maxOffset : 0)
    setDragging(false)
    startXRef.current = null
  }

  return (
    <div className="relative">
      {/* красная зона удаления по свайпу */}
      <div className="absolute inset-0 flex justify-end items-center pr-4">
        <button
          type="button"
          className="h-10 px-3 rounded-[12px] bg-[#FF3B30] text-white text-[13px] font-semibold flex items-center justify-center"
          onClick={() => onRemove(product.slug)}
        >
          Удалить
        </button>
      </div>

      {/* основная карточка, сдвигаем по X */}
      <div
        className="bg-card-bg rounded-[16px] p-3 flex items-center border border-border-light relative"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* чекбокс выбора товара */}
        <button
          type="button"
          className="w-6 h-6 mr-2 rounded-[8px] border border-accent bg-accent flex items-center justify-center flex-shrink-0"
          aria-label="Товар выбран"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5L9.5 17L19 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="w-[84px] h-[84px] bg-bg-base rounded-[10px] flex-shrink-0 overflow-hidden">
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain p-1" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-[10px]">Нет фото</div>
          )}
        </div>
        <div className="ml-3 flex-1 flex flex-col justify-between py-0.5 min-w-0">
          <div>
            <p className="text-[12px] text-text-secondary leading-none mt-1 line-clamp-1">{product.category || product.brand || 'Товар'}</p>
            <p className="text-[14px] font-medium text-text-primary line-clamp-2 mt-1 pr-10">{product.title}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-[16px]">{(product.display_price * qty).toLocaleString('ru-RU')} ₽</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#F8F8F8] rounded-[10px] px-1 py-0.5 min-w-[96px]">
                <button
                  className="w-7 h-7 flex items-center justify-center text-accent text-[18px] font-medium active:opacity-70"
                  onClick={() => onUpdateQty(product.slug, qty - 1)}
                >
                  −
                </button>
                <span className="text-[14px] font-semibold text-text-primary px-2 min-w-[24px] text-center">{qty}</span>
                <button
                  className="w-7 h-7 flex items-center justify-center text-accent text-[18px] font-medium active:opacity-70 disabled:opacity-50"
                  onClick={() => canInc && onUpdateQty(product.slug, qty + 1)}
                  disabled={!canInc}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { items, addItem, removeItem, updateQty, subtotal, promoApplied, applyPromo, clearPromo, referralBonusUsed, applyReferralBonus, clearReferralBonus } = useCartStore()
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

  const [recentlyRemoved, setRecentlyRemoved] = useState<CartItem | null>(null)

  function handleRemoveWithUndo(slug: string) {
    const item = items.find(i => i.product.slug === slug)
    if (!item) return
    setRecentlyRemoved(item)
    removeItem(slug)

    toast.custom((t) => (
      <div className="bg-white rounded-[14px] shadow-md px-3 py-2 flex items-center gap-3 border border-border-light">
        <span className="text-[14px] text-text-primary">Товар удалён</span>
        <button
          type="button"
          className="text-[14px] text-accent font-semibold"
          onClick={() => {
            addItem(item.product, item.qty)
            setRecentlyRemoved(null)
            toast.dismiss(t.id)
          }}
        >
          Отменить
        </button>
      </div>
    ), { duration: 4000 })
  }

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
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-10 pb-24">
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

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-4 overflow-y-auto">
        <h1 className="text-[28px] font-bold text-text-primary mb-4 flex-shrink-0">Корзина</h1>

        <div className="flex-1 min-h-0 pb-32">
          <div className="flex flex-col gap-3 mb-4">
            {items.map((item) => (
              <CartItemRow
                key={item.product.slug}
                item={item}
                onUpdateQty={updateQty}
                onRemove={handleRemoveWithUndo}
              />
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
            <div className="flex gap-1.5">
              <input
                type="text"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Введите промокод"
                className="flex-1 min-w-0 px-3 py-2 bg-bg-base rounded-[10px] text-[14px] text-text-primary outline-none border border-border-light focus:border-accent"
              />
              <Button
                variant="secondary"
                loading={promoLoading}
                onClick={applyPromoCode}
                className="flex-shrink-0 px-3 py-2 text-[12px]"
              >
                {promoLoading ? null : 'Применить'}
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
      </div>

      {/* кнопка оформить заказ — выше BottomNav */}
      <div className="fixed left-0 right-0 bg-white border-t border-border-light px-4 py-3 z-[60]"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button fullWidth onClick={() => navigate('/checkout')}>
          Оформить заказ — ₽{finalTotal.toLocaleString('ru-RU')}
        </Button>
      </div>
    </div>
  )
}
