import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useCartStore, type CartItem } from '../store/cart'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

type CartItemRowProps = {
  item: CartItem
  onUpdateQty: (slug: string, qty: number) => void
  onRemove: (slug: string) => void
}

const UNDO_TOAST_MS = 4000

function formatRub(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function getItemsLabel(total: number) {
  const mod10 = total % 10
  const mod100 = total % 100
  if (mod10 === 1 && mod100 !== 11) return `${total} товар`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${total} товара`
  return `${total} товаров`
}

type UndoRemoveToastProps = {
  durationMs: number
  onUndo: () => void
}

function UndoRemoveToast({ durationMs, onUndo }: UndoRemoveToastProps) {
  const [leftMs, setLeftMs] = useState(durationMs)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      setLeftMs(Math.max(0, durationMs - elapsed))
    }, 100)
    return () => window.clearInterval(timer)
  }, [durationMs])

  const secondsLeft = Math.max(1, Math.ceil(leftMs / 1000))
  const progress = leftMs / durationMs
  const radius = 9
  const stroke = 1.8
  const c = 2 * Math.PI * radius
  const dashOffset = c * (1 - progress)

  return (
    <div className="w-[361px] max-w-[calc(100vw-32px)] h-[45px] rounded-[12px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] px-[6px] py-[6px] flex items-center justify-between gap-2">
      <div className="flex items-center gap-[5px] min-w-0">
        <span className="relative w-6 h-6 flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r={radius} stroke="#D9D9D9" strokeWidth={stroke} />
            <circle
              cx="12"
              cy="12"
              r={radius}
              stroke="#434343"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 12 12)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold leading-none text-[#434343]">
            {secondsLeft}
          </span>
        </span>
        <span className="text-[14px] font-semibold leading-[110%] text-[#434343] truncate">Товар удалён</span>
      </div>
      <button
        type="button"
        className="h-[33px] px-[10px] rounded-[20px] text-[14px] font-semibold leading-[17px] text-[#0099FF] flex-shrink-0"
        onClick={onUndo}
      >
        Отменить
      </button>
    </div>
  )
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
    const shouldDelete = offsetX <= -maxOffset / 2
    if (shouldDelete) {
      onRemove(product.slug)
      setOffsetX(0)
    } else {
      setOffsetX(0)
    }
    setDragging(false)
    startXRef.current = null
  }

  return (
    <div className="relative h-[150px]">
      {/* красная зона удаления по свайпу */}
      <div className="absolute inset-0 flex justify-end items-stretch">
        <button
          type="button"
          className="w-[82px] rounded-[22px] bg-[#FF3B30] text-white text-[13px] font-semibold flex flex-col items-center justify-center"
          onClick={() => onRemove(product.slug)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="mt-1">Удалить</span>
        </button>
      </div>

      {/* основная карточка, сдвигаем по X */}
      <div
        className="h-full flex items-start relative bg-white"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="relative w-[150px] h-[150px] rounded-[22px] overflow-hidden bg-[#F8F8F8] flex-shrink-0">
          {/* чекбокс выбора товара */}
          <button
            type="button"
            className="absolute left-[10px] top-[10px] z-10 w-6 h-6 rounded-[8px] border-2 border-white bg-accent shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center justify-center"
            aria-label="Товар выбран"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5L9.5 17L19 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain p-1.5" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-[10px] bg-[#F4F5F7]">
              Нет фото
            </div>
          )}
        </div>
        <div className="ml-[10px] flex-1 min-w-0 h-[150px] pt-[10px] flex flex-col justify-between">
          <div className="space-y-[5px]">
            <p className="text-[18px] font-bold leading-[110%] text-[#434343]">
              {formatRub(product.display_price * qty)}
            </p>
            <p className="text-[14px] font-medium leading-[110%] text-[#797979] line-clamp-3">
              {product.title}
            </p>
          </div>
          <div className="w-[180px] h-[44px] rounded-[10px] bg-[#F8F8F8] px-[10px] flex items-center justify-between">
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center text-[#595959] text-[24px] leading-none active:opacity-70"
              onClick={() => onUpdateQty(product.slug, qty - 1)}
            >
              −
            </button>
            <span className="text-[16px] font-medium leading-[19px] text-[#595959] min-w-[40px] text-center">{qty}</span>
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center text-[#258CD1] text-[24px] leading-none active:opacity-70 disabled:opacity-50"
              onClick={() => canInc && onUpdateQty(product.slug, qty + 1)}
              disabled={!canInc}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { items, addItem, removeItem, updateQty, subtotal, clearCart, totalItems } = useCartStore()

  const sub = subtotal()
  const itemsTotal = totalItems()

  function handleRemoveWithUndo(slug: string) {
    const item = items.find(i => i.product.slug === slug)
    if (!item) return

    removeItem(slug)

    toast.custom((t) => (
      <UndoRemoveToast
        durationMs={UNDO_TOAST_MS}
        onUndo={() => {
          addItem(item.product, item.qty)
          toast.dismiss(t.id)
        }}
      />
    ), { duration: UNDO_TOAST_MS, position: 'bottom-center' })
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

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-5 overflow-y-auto">
        <h1 className="text-[26px] font-bold leading-[130%] text-[#343434] mb-[10px] flex-shrink-0">Корзина</h1>

        <div className="flex-1 min-h-0 pb-32">
          <div className="flex items-center justify-between h-8 mb-[22px]">
            <div className="flex items-center gap-[5px]">
              <span className="w-6 h-6 rounded-[8px] border-2 border-white bg-accent shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5L9.5 17L19 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[14px] font-medium leading-[22px] tracking-[-0.5px] text-[#595959]">
                {getItemsLabel(itemsTotal)}
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 text-[14px] font-medium leading-[22px] tracking-[-0.5px] text-[#1C1C1E] active:opacity-70"
              onClick={clearCart}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Удалить всё
            </button>
          </div>

          <div className="flex flex-col gap-[22px] mb-4">
            {items.map((item) => (
              <CartItemRow
                key={item.product.slug}
                item={item}
                onUpdateQty={updateQty}
                onRemove={handleRemoveWithUndo}
              />
            ))}
          </div>
        </div>
      </div>

      {/* кнопка оформления в стиле макета */}
      <div
        className="fixed left-0 right-0 px-4 z-[60]"
        style={{ bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          className="w-full h-[55px] rounded-[18px] bg-[#0099FF] px-[18px] flex items-center justify-between active:opacity-90"
          onClick={() => navigate('/checkout')}
        >
          <span className="text-[14px] font-semibold leading-[17px] text-white opacity-80">
            {getItemsLabel(itemsTotal)}
          </span>
          <span className="text-[16px] font-semibold leading-[19px] text-white">К оформлению</span>
          <span className="text-[14px] font-semibold leading-[17px] text-white opacity-80">
            {formatRub(sub)}
          </span>
        </button>
      </div>
    </div>
  )
}
