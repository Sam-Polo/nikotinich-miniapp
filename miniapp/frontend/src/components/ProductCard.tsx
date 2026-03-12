import toast from 'react-hot-toast'
import type { Product } from '../api'
import { useCartStore } from '../store/cart'
import { useFavoritesStore } from '../store/favorites'
import { useNavigate } from 'react-router-dom'
import Price from './Price'

type Props = {
  product: Product
  showAddButton?: boolean
}

export default function ProductCard({ product, showAddButton = true }: Props) {
  const navigate = useNavigate()
  const { addItem, updateQty, getQty } = useCartStore()
  const isFav = useFavoritesStore(s => s.isFavorite(product.slug))
  const toggleFav = useFavoritesStore(s => s.toggle)

  const displayPrice = product.display_price
  const hasDiscount = !!product.discount_price_rub
  const qty = getQty(product.slug)
  const stock = product.stock
  const canAddMore = stock == null || qty < stock

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (stock != null && stock <= 0) return
    addItem(product)
    toast.success('Добавлено в корзину', { id: `cart-${product.slug}` })
  }

  function handleDec(e: React.MouseEvent) {
    e.stopPropagation()
    updateQty(product.slug, qty - 1)
  }

  function handleInc(e: React.MouseEvent) {
    e.stopPropagation()
    if (!canAddMore) return
    updateQty(product.slug, qty + 1)
  }

  return (
    <div
      className="bg-card-bg rounded-card overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
      onClick={() => navigate(`/product/${product.slug}`)}
    >
      {/* изображение */}
      <div className="relative aspect-square bg-bg-base">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-contain p-2 mix-blend-multiply"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">
            Нет фото
          </div>
        )}
        {/* кнопка избранного */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center active:scale-90 transition-transform"
          onClick={(e) => { e.stopPropagation(); toggleFav(product) }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21.593c-.525-.327-4.25-2.83-6.393-5.125C3.43 14.085 3 12.41 3 11a5 5 0 0 1 9-3A5 5 0 0 1 21 11c0 1.41-.43 3.085-2.607 5.468C16.25 18.763 12.525 21.266 12 21.593z"
              fill={isFav ? '#FF3B30' : 'none'}
              stroke={isFav ? '#FF3B30' : '#8E8E93'}
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      {/* инфо — фиксированная высота блока под картинкой для одинаковых карточек в сетке */}
      <div className="p-3 flex flex-col min-h-[120px]">
        <p className="text-[13px] text-text-primary font-medium leading-tight line-clamp-2 mb-1">
          {product.title}
        </p>
        <div className="flex items-center gap-1.5">
          <Price value={displayPrice} size="md" />
          {hasDiscount && (
            <span className="text-[12px] text-text-secondary line-through">
              {product.price_rub.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>

        {showAddButton && (
          (stock != null && stock <= 0) ? (
            <p className="mt-2 py-2 text-center text-[13px] text-text-secondary flex-shrink-0">Нет в наличии</p>
          ) : qty > 0 ? (
            <div
              className="mt-2 flex items-center flex-shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center bg-[#F4F5F7] rounded-[12px] px-1.5 py-1 min-w-[96px]">
                <button
                  className="w-7 h-7 flex items-center justify-center text-accent text-[18px] font-medium active:opacity-70"
                  onClick={handleDec}
                >
                  −
                </button>
                <span className="text-[14px] font-semibold text-text-primary px-2 min-w-[24px] text-center">
                  {qty}
                </span>
                <button
                  className="w-7 h-7 flex items-center justify-center text-accent text-[18px] font-medium active:opacity-70 disabled:opacity-50"
                  onClick={handleInc}
                  disabled={!canAddMore}
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <button
              className="mt-2 w-full h-9 rounded-lg bg-[#F8F8F8] text-[14px] text-text-primary font-medium active:opacity-70 flex-shrink-0"
              onClick={handleAdd}
            >
              В корзину
            </button>
          )
        )}
      </div>
    </div>
  )
}
