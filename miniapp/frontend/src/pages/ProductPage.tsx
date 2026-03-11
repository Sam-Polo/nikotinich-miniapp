import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getProduct, getBrands, getLines, getProducts } from '../api'
import type { Product, Brand, Line } from '../api'
import { useCartStore } from '../store/cart'
import { useFavoritesStore } from '../store/favorites'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import Button from '../components/Button'
import Price from '../components/Price'

// крепость с большой буквы
function formatStrength(s?: string) {
  if (!s || !s.length) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export default function ProductPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [brandTitle, setBrandTitle] = useState<string | null>(null)
  const [lineTitle, setLineTitle] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [familyVariants, setFamilyVariants] = useState<Product[]>([])

  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

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
    // сбрасываем текущую картинку при смене товара
    setCurrentImageIndex(0)
  }, [product?.slug])

  useEffect(() => {
    if (!product?.category || !product?.brand) return
    getBrands(product.category)
      .then((brands: Brand[]) => {
        const b = brands.find(x => x.key === product.brand)
        setBrandTitle(b?.title ?? product.brand ?? null)
      })
      .catch(() => setBrandTitle(product.brand ?? null))
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

  // варианты внутри семейства (электронки с разными вкусами/затяжками)
  useEffect(() => {
    if (!product?.familyKey || !product.category) {
      setFamilyVariants([])
      return
    }

    getProducts({ category: product.category })
      .then(list => {
        const sameFamily = list.filter(
          p => p.familyKey === product.familyKey && p.slug !== product.slug
        )
        setFamilyVariants(sameFamily)
      })
      .catch(() => setFamilyVariants([]))
  }, [product?.familyKey, product?.category, product?.slug])

  if (loading) return <div className="flex flex-col min-h-full bg-bg-base"><PageHeader title="Никотиныч" subtitle="mini app" showBack /><Spinner /></div>
  if (!product) return <div className="flex flex-col min-h-full bg-bg-base"><PageHeader title="Никотиныч" subtitle="mini app" showBack /><p className="text-center text-text-secondary mt-20">Товар не найден</p></div>

  // захватываем после null-проверки чтобы TypeScript не терял тип в замыканиях
  const p = product
  const displayPrice = p.display_price
  const hasDiscount = !!p.discount_price_rub
  const images = p.images && p.images.length > 0 ? p.images : []
  const qty = getQty(p.slug)
  const stock = p.stock
  const canAddMore = stock == null || qty < stock

  const familyProducts: Product[] = p.familyKey
    ? [p, ...familyVariants.filter(v => v.slug !== p.slug)]
    : []

  const flavors = Array.from(
    new Set(
      familyProducts
        .map(fp => fp.flavor || '')
        .filter(Boolean)
    )
  )

  const puffsOptions = Array.from(
    new Set(
      familyProducts
        .filter(fp => fp.flavor === p.flavor && fp.puffs != null)
        .map(fp => fp.puffs as number)
    )
  ).sort((a, b) => a - b)

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current
    const startY = touchStartYRef.current
    touchStartXRef.current = null
    touchStartYRef.current = null

    if (startX == null || startY == null) return
    if (!images.length || images.length <= 1) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return

    if (dx < 0) {
      // свайп влево — следующая картинка
      setCurrentImageIndex(prev => (prev + 1) % images.length)
    } else {
      // свайп вправо — предыдущая картинка
      setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)
    }
  }

  function handleAdd() {
    if (stock != null && stock <= 0) return
    addItem(p)
    toast.success('Добавлено в корзину', { id: `cart-${p.slug}` })
  }

  function handleFlavorClick(flavor: string) {
    if (!p.familyKey || flavor === p.flavor) return
    const candidates = familyProducts.filter(fp => fp.flavor === flavor)
    if (!candidates.length) return
    // стараемся сохранить текущее количество затяжек, иначе берём первый вариант
    const samePuffs = p.puffs != null
      ? candidates.find(fp => fp.puffs === p.puffs)
      : undefined
    const target = samePuffs || candidates[0]
    if (target.slug !== p.slug) {
      navigate(`/product/${target.slug}`)
    }
  }

  function handlePuffsClick(puffs: number) {
    if (!p.familyKey || puffs === p.puffs) return
    // сначала ищем вариант с тем же вкусом, но другими затяжками
    let target = familyProducts.find(fp => fp.flavor === p.flavor && fp.puffs === puffs)
    if (!target) {
      // fallback — любой вариант с такими затяжками
      target = familyProducts.find(fp => fp.puffs === puffs)
    }
    if (target && target.slug !== p.slug) {
      navigate(`/product/${target.slug}`)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader
        title="Никотиныч"
        subtitle="mini app"
        showBack
        right={
          <button
            onClick={() => toggleFav(p)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80"
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

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* верх: зона с картинкой */}
        <div className="bg-[#F8F8F8]">
          <div
            className="aspect-square overflow-hidden relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 ? (
              <div className="w-full h-full overflow-hidden">
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {images.map((src, idx) => (
                    <div key={src + idx} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                      <img
                        src={src}
                        alt={p.title}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary">
                Нет фото
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[rgba(0,0,0,0.3)] backdrop-blur-[10px] flex items-center gap-1.5">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`rounded-full bg-white transition-all ${
                      idx === currentImageIndex ? 'w-2 h-2' : 'w-1.5 h-1.5 opacity-70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* нижняя карточка как bottom sheet, «вылазит» с границей ровно под фото */}
        <div className="-mt-6 flex-1 overflow-y-auto">
          <div className="bg-white rounded-t-[26px] px-4 pt-4 pb-32 shadow-[0_-6px_18px_rgba(0,0,0,0.06)]">
            <h1 className="text-[20px] font-bold text-[#434343] mb-1 leading-[1.2]">{p.title}</h1>

            <div className="flex items-center gap-3 mb-4">
              <Price value={displayPrice} size="lg" />
              {hasDiscount && (
                <span className="text-[16px] text-[#8E8E93] line-through">
                  {p.price_rub.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>

            {/* теги: вкус и количество затяжек, в стиле Figma */}
            {familyProducts.length > 1 && (
              <div className="space-y-4 mb-4">
                {flavors.length > 0 && p.flavor && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[14px]">
                    <span className="text-[#797979]">Вкус</span>
                    <span className="text-[#595959]">{p.flavor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {flavors.map(f => {
                        const isActive = f === p.flavor
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => handleFlavorClick(f)}
                            className={[
                                'px-3 py-1.5 rounded-full text-[14px] leading-[22px] text-center',
                              isActive ? 'bg-[#434343] text-white' : 'bg-[#F8F8F8] text-[#434343]'
                            ].join(' ')}
                          >
                            {f}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {puffsOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[14px]">
                      <span className="text-[#797979]">Затяжки</span>
                      {p.puffs != null && (
                        <span className="text-[#595959]">{p.puffs.toLocaleString('ru-RU')}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {puffsOptions.map(v => {
                        const isActive = p.puffs === v
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handlePuffsClick(v)}
                            className={[
                                'px-3 py-1.5 rounded-full text-[14px] leading-[22px] text-center',
                              isActive ? 'bg-[#434343] text-white' : 'bg-[#F8F8F8] text-[#434343]'
                            ].join(' ')}
                          >
                            {v.toLocaleString('ru-RU')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* описание */}
            {p.description && (
              <div className="mb-4">
                <p
                  className={`text-[14px] text-text-secondary leading-relaxed ${
                    !expanded ? 'line-clamp-3' : ''
                  }`}
                >
                  {p.description}
                </p>
                {p.description.length > 120 && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="text-accent text-[14px] mt-1"
                  >
                    {expanded ? 'Свернуть' : 'Дальше'}
                  </button>
                )}
              </div>
            )}

            {/* характеристики: бренд и линейка по названиям, крепость с большой буквы */}
            <div className="bg-[#F4F4F7] rounded-card p-4 space-y-2 mt-2">
              {(brandTitle ?? p.brand) && (
                <Row label="Бренд" value={brandTitle ?? p.brand ?? ''} />
              )}
              {(lineTitle ?? p.line) && (
                <Row label="Линейка" value={lineTitle ?? p.line ?? ''} />
              )}
              {p.strength && <Row label="Крепость" value={formatStrength(p.strength)} />}
              {p.article && <Row label="Артикул" value={p.article} />}
            </div>
          </div>
        </div>
      </div>

      {/* кнопка корзины (sticky снизу) — счётчик если уже добавлен, учёт остатка */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 z-[60]"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
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
            <Price value={displayPrice} size="sm" className="opacity-80" />
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
