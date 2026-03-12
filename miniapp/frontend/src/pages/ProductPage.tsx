import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

function formatArticleCode(article?: string) {
  if (!article) return ''
  const digits = article.replace(/\D/g, '')
  if (!digits) return article
  return digits.slice(-4).padStart(4, '0')
}

const ADD_TOAST_MS = 2200

type AddedToCartToastProps = {
  durationMs: number
}

function AddedToCartToast({ durationMs }: AddedToCartToastProps) {
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
    <div className="w-[361px] max-w-[calc(100vw-32px)] h-[45px] rounded-[12px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] px-[10px] py-[6px] flex items-center gap-[6px]">
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
      <span className="text-[14px] font-semibold leading-[110%] text-[#434343] truncate">Добавлено в корзину</span>
    </div>
  )
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
  const [sheetPresented, setSheetPresented] = useState(false)
  const [sheetDragY, setSheetDragY] = useState(0)
  const [sheetDragging, setSheetDragging] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const [switchingVariant, setSwitchingVariant] = useState(false)
  const [showAddedToast, setShowAddedToast] = useState(false)

  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const closeTouchStartYRef = useRef<number | null>(null)
  const closeDraggingRef = useRef(false)
  const sheetPresentedRef = useRef(false)

  const { addItem, updateQty, getQty } = useCartStore()
  const isFav = useFavoritesStore(s => s.isFavorite(slug))
  const toggleFav = useFavoritesStore(s => s.toggle)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setContentVisible(false)

    getProduct(slug)
      .then((nextProduct) => {
        if (cancelled) return
        setProduct(nextProduct)
      })
      .catch(() => {
        if (cancelled) return
        setProduct(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (loading || sheetPresentedRef.current) return
    const raf = window.requestAnimationFrame(() => {
      setSheetPresented(true)
      sheetPresentedRef.current = true
    })
    return () => window.cancelAnimationFrame(raf)
  }, [loading])

  useEffect(() => {
    // сбрасываем текущую картинку при смене товара
    setCurrentImageIndex(0)
  }, [product?.slug])

  useEffect(() => {
    if (loading) return
    const raf = window.requestAnimationFrame(() => {
      setContentVisible(true)
      setSwitchingVariant(false)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [loading, slug])

  useEffect(() => {
    if (!showAddedToast) return
    const tid = window.setTimeout(() => setShowAddedToast(false), ADD_TOAST_MS)
    return () => window.clearTimeout(tid)
  }, [showAddedToast])

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

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <Spinner />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <p className="text-center text-text-secondary mt-20">Товар не найден</p>
      </div>
    )
  }

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

  const puffsOptions = p.flavor
    ? Array.from(
        new Set(
          familyProducts
            .filter(fp => fp.flavor === p.flavor && fp.puffs != null)
            .map(fp => fp.puffs as number)
        )
      ).sort((a, b) => a - b)
    : []

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
    setShowAddedToast(true)
  }

  function closeSheet() {
    setSheetPresented(false)
    window.setTimeout(() => navigate('/'), 180)
  }

  function navigateWithTransition(targetSlug: string) {
    if (targetSlug === p.slug || switchingVariant) return
    setSwitchingVariant(true)
    setContentVisible(false)
    navigate(`/product/${targetSlug}`)
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
    navigateWithTransition(target.slug)
  }

  function handlePuffsClick(puffs: number) {
    if (!p.familyKey || !p.flavor || puffs === p.puffs) return
    // ищем вариант ТОЛЬКО в рамках текущего вкуса
    const target = familyProducts.find(fp => fp.flavor === p.flavor && fp.puffs === puffs)
    if (target) navigateWithTransition(target.slug)
  }

  function handleSheetTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return
    closeTouchStartYRef.current = e.touches[0].clientY
    closeDraggingRef.current = true
    setSheetDragging(true)
  }

  function handleSheetTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!closeDraggingRef.current || closeTouchStartYRef.current == null) return
    e.preventDefault()
    const delta = e.touches[0].clientY - closeTouchStartYRef.current
    if (delta > 0) setSheetDragY(Math.min(delta * 0.65, 180))
  }

  function handleSheetTouchEnd() {
    if (!closeDraggingRef.current) return
    closeDraggingRef.current = false
    closeTouchStartYRef.current = null
    setSheetDragging(false)
    if (sheetDragY > 72) {
      closeSheet()
      return
    }
    setSheetDragY(0)
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base" data-product-layout="sheet">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      {/* overlay и sheet через fixed, чтобы не зависеть от flex в TG WebView */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-200 z-[55]"
        style={{ opacity: sheetPresented ? 1 : 0 }}
        onClick={closeSheet}
        aria-hidden
      />

      <div
        className={`fixed inset-x-0 bottom-0 top-14 bg-white rounded-t-[26px] overflow-hidden z-[56] flex flex-col ${
          sheetDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: `translateY(${sheetPresented ? sheetDragY : 120}%)` }}
      >
        <div
          className="h-[13px] flex items-center justify-center touch-none"
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onTouchCancel={handleSheetTouchEnd}
        >
          <span className="w-9 h-[3px] rounded-full bg-[#C5C5C5]" />
        </div>

        <div
          className={`relative min-h-0 flex-1 overflow-y-auto pb-36 transition-all duration-200 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <Spinner />
            </div>
          )}
          <div className="bg-[#F8F8F8] relative">
            <div
              className="h-[310px] overflow-hidden relative"
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
                      <div
                        key={src + idx}
                        className="w-full h-full flex-shrink-0 flex items-center justify-center"
                      >
                        <img
                          src={src}
                          alt={p.title}
                          className="w-[320px] h-[320px] object-contain mix-blend-multiply"
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

              <button
                type="button"
                onClick={() => toggleFav(p)}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center"
              >
                <svg width="28" height="28" viewBox="0 0 24 22" fill={isFav ? '#FF4545' : 'none'}>
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    stroke="#FF4545"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>

              {images.length > 1 && (
                <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 h-5 px-1.5 rounded-full bg-[rgba(0,0,0,0.3)] backdrop-blur-[10px] flex items-center gap-[6px]">
                  {images.map((_, idx) => (
                    <span
                      key={idx}
                      className={`rounded-full bg-white transition-all ${
                        idx === currentImageIndex ? 'w-2 h-2' : 'w-[3px] h-[3px] opacity-70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pt-6">
            <div className="space-y-3 mb-5">
              <h1 className="text-[20px] font-bold leading-[120%] text-[#434343]">{p.title}</h1>
              <div className="flex items-center gap-2">
                <Price value={displayPrice} size="lg" />
                {hasDiscount && (
                  <span className="text-[16px] text-[#8E8E93] line-through">
                    {p.price_rub.toLocaleString('ru-RU')} ₽
                  </span>
                )}
              </div>
            </div>

            {familyProducts.length > 1 && (
              <div className="space-y-[18px] mb-5">
                {puffsOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[14px]">
                      <span className="text-[#797979]">Кол-во затяжек:</span>
                      {p.puffs != null && (
                        <span className="text-[#595959]">
                          {p.puffs.toLocaleString('ru-RU')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {puffsOptions.map((v) => {
                        const isActive = p.puffs === v
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handlePuffsClick(v)}
                            className={[
                              'h-[34px] px-3 rounded-full text-[14px] font-normal leading-[22px] tracking-[-0.5px] transition-colors',
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

                {flavors.length > 0 && p.flavor && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[14px]">
                      <span className="text-[#797979]">Вкус:</span>
                      <span className="text-[#595959]">{p.flavor}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {flavors.map((f) => {
                        const isActive = f === p.flavor
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => handleFlavorClick(f)}
                            className={[
                              'h-[34px] px-3 rounded-full text-[14px] font-normal leading-[22px] tracking-[-0.5px] transition-colors',
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
              </div>
            )}

            {p.description && (
              <div className="mb-4">
                <h2 className="text-[14px] font-bold leading-[120%] text-[#434343] mb-2">
                  О товаре
                </h2>
                <p
                  className={`text-[14px] font-normal leading-[130%] text-[#595959] ${
                    !expanded ? 'line-clamp-3' : ''
                  }`}
                >
                  {p.description}
                </p>
                {p.description.length > 120 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-accent text-[14px] mt-1"
                  >
                    {expanded ? 'Свернуть' : 'Дальше'}
                  </button>
                )}
              </div>
            )}

            {/* блок мета-данных без заливки и рамки */}
            <div className="space-y-2 mt-2">
              {(brandTitle ?? p.brand) && (
                <Row label="Бренд" value={brandTitle ?? p.brand ?? ''} />
              )}
              {(lineTitle ?? p.line) && (
                <Row label="Линейка" value={lineTitle ?? p.line ?? ''} />
              )}
              {p.strength && <Row label="Крепость" value={formatStrength(p.strength)} />}
              {p.article && <Row label="Артикул" value={formatArticleCode(p.article)} />}
            </div>
          </div>
        </div>
      </div>

      {showAddedToast && (
        <div
          className="fixed left-4 right-4 z-[65] flex justify-center pointer-events-none"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
        >
          <AddedToCartToast durationMs={ADD_TOAST_MS} />
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 z-[60]"
        style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {stock != null && stock <= 0 ? (
          <p className="py-3 text-center text-text-secondary text-[14px]">Нет в наличии</p>
        ) : qty > 0 ? (
          <div className="grid grid-cols-2 gap-1 h-[55px]">
            <button
              type="button"
              className="h-[55px] rounded-[18px] bg-[#0099FF] text-white text-[16px] font-semibold leading-[19px] active:opacity-90"
              onClick={() => navigate('/cart')}
            >
              К оформлению
            </button>
            <div className="h-[55px] rounded-[18px] bg-[#F8F8F8] px-[10px] flex items-center justify-between">
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center text-[#595959] text-[24px] leading-none active:opacity-70"
                onClick={() => updateQty(p.slug, qty - 1)}
              >
                −
              </button>
              <span className="text-[16px] font-medium leading-[19px] text-[#595959]">
                {qty}
              </span>
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center text-[#258CD1] text-[24px] leading-none active:opacity-70 disabled:opacity-50"
                onClick={handleAdd}
                disabled={!canAddMore}
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <Button fullWidth onClick={handleAdd} className="justify-between">
            <span>Добавить в корзину</span>
            <span className="inline-flex items-baseline text-white opacity-90">
              <span className="text-[14px] font-semibold leading-[100%]">
                {displayPrice.toLocaleString('ru-RU')}
              </span>
              <span className="ml-1 text-[14px] font-semibold leading-[100%]">₽</span>
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-[#797979]">{label}</span>
      <span className="text-[13px] font-medium text-[#434343]">{value}</span>
    </div>
  )
}
