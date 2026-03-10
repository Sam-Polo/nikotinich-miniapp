import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories } from '../api'
import type { Category } from '../api'
import { useFavoritesStore } from '../store/favorites'
import { useCartStore } from '../store/cart'
import PageHeader from '../components/PageHeader'

export default function FavoritesPage() {
  const { items, toggle } = useFavoritesStore()
  const addItem = useCartStore(s => s.addItem)
  const getQty = useCartStore(s => s.getQty)
  const updateQty = useCartStore(s => s.updateQty)
  const totalItems = useCartStore(s => s.totalItems)
  const subtotal = useCartStore(s => s.subtotal)
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showAddedToast, setShowAddedToast] = useState(false)
  const [toastImage, setToastImage] = useState<string | undefined>(undefined)

  const cartQty = totalItems()
  const cartSum = subtotal()

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!showAddedToast) return
    const tid = window.setTimeout(() => setShowAddedToast(false), 2200)
    return () => window.clearTimeout(tid)
  }, [showAddedToast])

  const filteredItems = useMemo(() => {
    if (!activeFilter) return items
    return items.filter(p => (p.category || '').toLowerCase() === activeFilter.toLowerCase())
  }, [activeFilter, items])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 px-4 pt-4 pb-[190px]">
        <h1 className="text-[28px] font-bold text-text-primary mb-4">Избранное</h1>

        {/* фильтры: иконка filter + чипы категорий по Figma */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            aria-label="Сбросить фильтр"
            className="h-9 w-9 rounded-full bg-[#ECECEF] flex items-center justify-center flex-shrink-0 text-[#55565A]"
            onClick={() => setActiveFilter(null)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="16" y2="12" />
              <line x1="4" y1="18" x2="12" y2="18" />
            </svg>
          </button>
          {categories.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveFilter(activeFilter === cat.key ? null : cat.key)}
              className={[
                'h-9 px-4 rounded-full text-[14px] whitespace-nowrap transition-colors flex-shrink-0 font-medium',
                activeFilter === cat.key ? 'bg-accent text-white' : 'bg-[#ECECEF] text-[#55565A]'
              ].join(' ')}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {items.length === 0 && (
          <div className="flex flex-col items-center mt-20 text-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mb-4 opacity-30">
              <path d="M12 21.593c-.525-.327-4.25-2.83-6.393-5.125C3.43 14.085 3 12.41 3 11a5 5 0 0 1 9-3A5 5 0 0 1 21 11c0 1.41-.43 3.085-2.607 5.468C16.25 18.763 12.525 21.266 12 21.593z"
                stroke="#8E8E93" strokeWidth="2" />
            </svg>
            <p className="text-text-secondary text-[16px]">Список избранного пуст</p>
            <p className="text-text-secondary text-[14px] mt-1 opacity-60">Добавляйте товары из каталога</p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map(product => {
              const qty = getQty(product.slug)
              const stock = product.stock
              const canAddMore = stock == null || qty < stock
              const outOfStock = stock !== undefined && stock <= 0

              const handleAdd = (e: React.MouseEvent) => {
                e.stopPropagation()
                if (outOfStock) return
                addItem(product)
                setToastImage(product.images[0])
                setShowAddedToast(true)
              }

              const handleInc = (e: React.MouseEvent) => {
                e.stopPropagation()
                if (!canAddMore) return
                updateQty(product.slug, qty + 1)
              }

              const handleDec = (e: React.MouseEvent) => {
                e.stopPropagation()
                updateQty(product.slug, qty - 1)
              }

              return (
                <div
                  key={product.slug}
                  className="min-w-0 bg-white rounded-[12px] overflow-hidden shadow-sm border border-border-light"
                >
                  <div
                    className="w-full aspect-square bg-[#F2F2F7] relative overflow-hidden"
                    onClick={() => navigate(`/product/${product.slug}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/product/${product.slug}`)
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(product)
                      }}
                      className="absolute top-2 right-2 z-10 text-[#FF3B30]"
                      aria-label="Удалить из избранного"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 22" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-contain p-3"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-[12px]">
                        Нет фото
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-[18px] font-bold text-text-primary leading-tight">
                      {product.display_price.toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="text-[14px] text-text-secondary line-clamp-2 mt-1 leading-snug">
                      {product.title}
                    </p>

                    {outOfStock ? (
                      <p className="mt-2 text-[13px] text-red-500 font-medium">Нет в наличии</p>
                    ) : qty > 0 ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg bg-[#ECECEF] text-[#6A6B70] text-lg leading-none flex items-center justify-center active:opacity-70"
                          onClick={handleDec}
                        >
                          −
                        </button>
                        <span className="h-9 flex-1 min-w-[36px] rounded-lg bg-[#ECECEF] text-[15px] text-text-primary font-medium flex items-center justify-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg bg-[#ECECEF] text-accent text-lg leading-none flex items-center justify-center disabled:opacity-50 active:opacity-70"
                          onClick={handleInc}
                          disabled={!canAddMore}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mt-2 h-9 rounded-lg bg-[#ECECEF] text-[15px] text-text-primary font-medium w-full active:opacity-70"
                        onClick={handleAdd}
                      >
                        В корзину
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filteredItems.length === 0 && items.length > 0 && (
          <div className="text-center text-text-secondary mt-14">
            В этой категории пока нет избранных товаров
          </div>
        )}
      </div>

      {showAddedToast && (
        <div className="fixed left-4 right-4 bottom-[86px] z-[65] bg-[#F1F1F2] rounded-[14px] px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-white overflow-hidden flex items-center justify-center">
            {toastImage ? (
              <img src={toastImage} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-[9px] text-text-secondary">товар</span>
            )}
          </div>
          <span className="text-[14px] text-[#4A4B50] font-medium">Товар в корзине</span>
        </div>
      )}

      {cartQty > 0 && (
        <button
          className="fixed left-4 right-4 bottom-[86px] z-[60] h-14 rounded-[18px] bg-accent text-white px-4 flex items-center justify-between text-[15px] font-semibold"
          onClick={() => navigate('/cart')}
        >
          <span>{cartQty} товар{cartQty > 1 && cartQty < 5 ? 'а' : cartQty >= 5 ? 'ов' : ''}</span>
          <span>Перейти в корзину</span>
          <span>{cartSum.toLocaleString('ru-RU')} ₽</span>
        </button>
      )}
    </div>
  )
}
