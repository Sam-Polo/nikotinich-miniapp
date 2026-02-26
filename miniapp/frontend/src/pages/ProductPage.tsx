import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProduct } from '../api'
import type { Product } from '../api'
import { useCartStore } from '../store/cart'
import { useFavoritesStore } from '../store/favorites'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import Button from '../components/Button'

export default function ProductPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const addItem = useCartStore(s => s.addItem)
  const isFav = useFavoritesStore(s => s.isFavorite(slug))
  const toggleFav = useFavoritesStore(s => s.toggle)

  useEffect(() => {
    getProduct(slug)
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="flex flex-col min-h-full bg-bg-base"><PageHeader title="Никотиныч" subtitle="mini app" showBack /><Spinner /></div>
  if (!product) return <div className="flex flex-col min-h-full bg-bg-base"><PageHeader title="Никотиныч" subtitle="mini app" showBack /><p className="text-center text-text-secondary mt-20">Товар не найден</p></div>

  const displayPrice = product.display_price
  const hasDiscount = !!product.discount_price_rub
  const images = product.images.length > 0 ? product.images : ['']

  return (
    <div className="flex flex-col min-h-full bg-white">
      <PageHeader
        title="Никотиныч"
        subtitle="mini app"
        showBack
        right={
          <button
            onClick={() => toggleFav(product)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-base"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21.593c-.525-.327-4.25-2.83-6.393-5.125C3.43 14.085 3 12.41 3 11a5 5 0 0 1 9-3A5 5 0 0 1 21 11c0 1.41-.43 3.085-2.607 5.468C16.25 18.763 12.525 21.266 12 21.593z"
                fill={isFav ? '#FF3B30' : 'none'}
                stroke={isFav ? '#FF3B30' : '#8E8E93'}
                strokeWidth="2"
              />
            </svg>
          </button>
        }
      />

      {/* галерея изображений */}
      <div className="relative bg-bg-base">
        <div className="aspect-square overflow-hidden">
          {images[imgIdx] ? (
            <img
              src={images[imgIdx]}
              alt={product.title}
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">Нет фото</div>
          )}
        </div>

        {/* индикаторы слайдера */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 py-3">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`rounded-full transition-all ${i === imgIdx ? 'w-4 h-2 bg-accent' : 'w-2 h-2 bg-gray-300'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* детали товара */}
      <div className="px-4 pt-4 pb-32">
        <h1 className="text-[22px] font-bold text-text-primary mb-1">{product.title}</h1>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-[28px] font-bold text-text-primary">
            ₽{displayPrice.toLocaleString('ru-RU')}
          </span>
          {hasDiscount && (
            <span className="text-[18px] text-text-secondary line-through">
              ₽{product.price_rub.toLocaleString('ru-RU')}
            </span>
          )}
        </div>

        {/* описание */}
        {product.description && (
          <div className="mb-4">
            <p className={`text-[14px] text-text-secondary leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
              {product.description}
            </p>
            {product.description.length > 120 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-accent text-[14px] mt-1"
              >
                {expanded ? 'Свернуть' : 'Дальше'}
              </button>
            )}
          </div>
        )}

        {/* характеристики */}
        <div className="bg-bg-base rounded-card p-4 space-y-2">
          {product.brand && <Row label="Бренд" value={product.brand} />}
          {product.line && <Row label="Линейка" value={product.line} />}
          {product.strength && <Row label="Крепость" value={product.strength} />}
          {product.article && <Row label="Артикул" value={product.article} />}
        </div>
      </div>

      {/* кнопка "Добавить в корзину" (sticky снизу) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 pb-safe">
        <Button
          fullWidth
          onClick={() => addItem(product)}
          className="justify-between"
        >
          <span>Добавить в корзину</span>
          <span className="opacity-80">₽{displayPrice.toLocaleString('ru-RU')}</span>
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[13px] font-medium text-text-primary">{value}</span>
    </div>
  )
}
