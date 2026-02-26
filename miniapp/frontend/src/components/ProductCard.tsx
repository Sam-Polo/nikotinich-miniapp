import toast from 'react-hot-toast'
import type { Product } from '../api'
import { useCartStore } from '../store/cart'
import { useFavoritesStore } from '../store/favorites'
import { useNavigate } from 'react-router-dom'

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

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    addItem(product)
    toast.success('Добавлено в корзину', { id: `cart-${product.slug}` })
  }

  function handleDec(e: React.MouseEvent) {
    e.stopPropagation()
    updateQty(product.slug, qty - 1)
  }

  function handleInc(e: React.MouseEvent) {
    e.stopPropagation()
    updateQty(product.slug, qty + 1)
  }

  return (
    <div
      className="bg-card-bg rounded-card overflow-hidden shadow-sm cursor-pointer active:opacity-80 transition-opacity"
      onClick={() => navigate(`/product/${product.slug}`)}
    >
      {/* изображение */}
      <div className="relative aspect-square bg-bg-base">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">
            Нет фото
          </div>
        )}
        {/* кнопка избранного */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
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

      {/* инфо */}
      <div className="p-3">
        <p className="text-[13px] text-text-primary font-medium leading-tight line-clamp-2 mb-1">
          {product.title}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-bold text-text-primary">
            ₽{displayPrice.toLocaleString('ru-RU')}
          </span>
          {hasDiscount && (
            <span className="text-[12px] text-text-secondary line-through">
              ₽{product.price_rub.toLocaleString('ru-RU')}
            </span>
          )}
        </div>

        {showAddButton && (
          qty > 0 ? (
            // счётчик когда товар уже в корзине
            <div
              className="mt-2 flex items-center justify-between bg-bg-base rounded-[10px] px-1"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="w-8 h-8 flex items-center justify-center text-accent text-[20px] font-light"
                onClick={handleDec}
              >
                −
              </button>
              <span className="text-[14px] font-semibold text-text-primary">{qty}</span>
              <button
                className="w-8 h-8 flex items-center justify-center text-accent text-[20px] font-light"
                onClick={handleInc}
              >
                +
              </button>
            </div>
          ) : (
            <button
              className="mt-2 w-full py-2 bg-bg-base rounded-[10px] text-accent text-[13px] font-semibold active:bg-blue-50 transition-colors"
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
