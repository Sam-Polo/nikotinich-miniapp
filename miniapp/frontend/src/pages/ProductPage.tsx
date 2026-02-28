import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getProduct, getBrands, getLines } from '../api'
import type { Product, Brand, Line } from '../api'
import { useCartStore } from '../store/cart'
import { useFavoritesStore } from '../store/favorites'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import Button from '../components/Button'

// крепость с большой буквы
function formatStrength(s?: string) {
  if (!s || !s.length) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export default function ProductPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [brandTitle, setBrandTitle] = useState<string | null>(null)
  const [lineTitle, setLineTitle] = useState<string | null>(null)

  const { addItem, updateQty, getQty } = useCartStore()
  const isFav = useFavoritesStore(s => s.isFavorite(slug))
  const toggleFav = useFavoritesStore(s => s.toggle)

  useEffect(() => {
    getProduct(slug)
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!product?.category || !product?.brand) return
    getBrands(product.category)
      .then((brands: Brand[]) => {
        const b = brands.find(x => x.key === product.brand)
        setBrandTitle(b?.title ?? product.brand)
      })
      .catch(() => setBrandTitle(product.brand))
  }, [product?.category, product?.brand])

  useEffect(() => {
    if (!product?.brand) return
    getLines(product.brand)
      .then((lines: Line[]) => {
        const l = lines.find(x => x.key === product.line)
        setLineTitle(l?.title ?? product.line ?? null)
      })
      .catch(() => setLineTitle(product.line ?? null))
  }, [product?.brand, product?.line])

  if (loading) return <div className="flex flex-col min-h-full bg-bg-base"><PageHeader title="Никотиныч" subtitle="shop" showBack /><Spinner /></div>
  if (!product) return <div className="flex flex-col min-h-full bg-bg-base"><PageHeader title="Никотиныч" subtitle="shop" showBack /><p className="text-center text-text-secondary mt-20">Товар не найден</p></div>

  // захватываем после null-проверки чтобы TypeScript не терял тип в замыканиях
  const p = product
  const displayPrice = p.display_price
  const hasDiscount = !!p.discount_price_rub
  const images = p.images.length > 0 ? p.images : ['']
  const qty = getQty(p.slug)
  const stock = p.stock
  const canAddMore = stock == null || qty < stock

  function handleAdd() {
    if (stock != null && stock <= 0) return
    addItem(p)
    toast.success('Добавлено в корзину', { id: `cart-${p.slug}` })
  }

  return (
    <div className="flex flex-col min-h-full bg-white">
      <PageHeader
        title="Никотиныч"
        subtitle="shop"
        showBack
        right={
          <button
            onClick={() => toggleFav(p)}
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
              alt={p.title}
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
        <h1 className="text-[22px] font-bold text-text-primary mb-1">{p.title}</h1>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-[28px] font-bold text-text-primary">
            ₽{displayPrice.toLocaleString('ru-RU')}
          </span>
          {hasDiscount && (
            <span className="text-[18px] text-text-secondary line-through">
              ₽{p.price_rub.toLocaleString('ru-RU')}
            </span>
          )}
        </div>

        {/* описание */}
        {p.description && (
          <div className="mb-4">
            <p className={`text-[14px] text-text-secondary leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
              {p.description}
            </p>
            {p.description.length > 120 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-accent text-[14px] mt-1"
              >
                {expanded ? 'Свернуть' : 'Дальше'}
              </button>
            )}
          </div>
        )}

        {/* характеристики: бренд и линейка по названиям, крепость с большой буквы */}
        <div className="bg-bg-base rounded-card p-4 space-y-2">
          {(brandTitle ?? p.brand) && <Row label="Бренд" value={brandTitle ?? p.brand ?? ''} />}
          {(lineTitle ?? p.line) && <Row label="Линейка" value={lineTitle ?? p.line ?? ''} />}
          {p.strength && <Row label="Крепость" value={formatStrength(p.strength)} />}
          {p.article && <Row label="Артикул" value={p.article} />}
        </div>
      </div>

      {/* кнопка корзины (sticky снизу) — счётчик если уже добавлен, учёт остатка */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 z-[60]"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {stock != null && stock <= 0 ? (
          <p className="py-3 text-center text-text-secondary text-[14px]">Нет в наличии</p>
        ) : qty > 0 ? (
          <div className="flex items-center justify-between bg-accent rounded-[14px] px-4 py-3">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white text-[22px] font-light"
              onClick={() => updateQty(p.slug, qty - 1)}
            >
              −
            </button>
            <span className="text-white font-semibold text-[16px]">{qty} в корзине</span>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white text-[22px] font-light disabled:opacity-50"
              onClick={handleAdd}
              disabled={!canAddMore}
            >
              +
            </button>
          </div>
        ) : (
          <Button fullWidth onClick={handleAdd} className="justify-between">
            <span>Добавить в корзину</span>
            <span className="opacity-80">₽{displayPrice.toLocaleString('ru-RU')}</span>
          </Button>
        )}
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
