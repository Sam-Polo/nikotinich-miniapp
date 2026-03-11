import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories } from '../api'
import type { Category } from '../api'
import { useFavoritesStore } from '../store/favorites'
import { useCartStore } from '../store/cart'
import PageHeader from '../components/PageHeader'
import { formatPriceRub } from '../utils/formatPrice'

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

  const hasActiveFilter = !!activeFilter

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
            className={[
              'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
              !hasActiveFilter ? 'bg-accent text-white' : 'bg-[#F8F8F8] text-[#55565A]'
            ].join(' ')}
            onClick={() => setActiveFilter(null)}
          >
            {/* filter.svg — цвет иконки меняем в зависимости от активности */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill={!hasActiveFilter ? 'white' : '#595959'} xmlns="http://www.w3.org/2000/svg">
              <path d="M18.4375 6.5625H1.5625C1.31386 6.5625 1.0754 6.46373 0.899587 6.28791C0.723772 6.1121 0.625 5.87364 0.625 5.625C0.625 5.37636 0.723772 5.1379 0.899587 4.96209C1.0754 4.78627 1.31386 4.6875 1.5625 4.6875H18.4375C18.6861 4.6875 18.9246 4.78627 19.1004 4.96209C19.2762 5.1379 19.375 5.37636 19.375 5.625C19.375 5.87364 19.2762 6.1121 19.1004 6.28791C18.9246 6.46373 18.6861 6.5625 18.4375 6.5625ZM15.3125 10.9375H4.6875C4.43886 10.9375 4.2004 10.8387 4.02459 10.6629C3.84877 10.4871 3.75 10.2486 3.75 10C3.75 9.75136 3.84877 9.5129 4.02459 9.33709C4.2004 9.16127 4.43886 9.0625 4.6875 9.0625H15.3125C15.5611 9.0625 15.7996 9.16127 15.9754 9.33709C16.1512 9.5129 16.25 9.75136 16.25 10C16.25 10.2486 16.1512 10.4871 15.9754 10.6629C15.7996 10.8387 15.5611 10.9375 15.3125 10.9375ZM11.5625 15.3125H8.4375C8.18886 15.3125 7.9504 15.2137 7.77459 15.0379C7.59877 14.8621 7.5 14.6236 7.5 14.375C7.5 14.1264 7.59877 13.8879 7.77459 13.7121C7.9504 13.5363 8.18886 13.4375 8.4375 13.4375H11.5625C11.8111 13.4375 12.0496 13.5363 12.2254 13.7121C12.4012 13.8879 12.5 14.1264 12.5 14.375C12.5 14.6236 12.4012 14.8621 12.2254 15.0379C12.0496 15.2137 11.8111 15.3125 11.5625 15.3125Z" />
            </svg>
          </button>
          {categories.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveFilter(activeFilter === cat.key ? null : cat.key)}
              className={[
                'h-9 px-4 rounded-full text-[14px] whitespace-nowrap transition-colors flex-shrink-0 font-medium',
                activeFilter === cat.key ? 'bg-accent text-white' : 'bg-[#F8F8F8] text-[#55565A]'
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
                const currentQty = getQty(product.slug)
                if (!(stock == null || currentQty < (stock ?? 0))) return
                updateQty(product.slug, currentQty + 1)
              }

              const handleDec = (e: React.MouseEvent) => {
                e.stopPropagation()
                const currentQty = getQty(product.slug)
                if (currentQty <= 1) {
                  updateQty(product.slug, 0)
                } else {
                  updateQty(product.slug, currentQty - 1)
                }
              }

              return (
                <div
                  key={product.slug}
                  className="min-w-0 bg-white rounded-[16px] overflow-hidden shadow-sm"
                >
                  <div
                    className="w-full aspect-square bg-[#F8F8F8] relative overflow-hidden"
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
                      {formatPriceRub(product.display_price)}
                    </p>
                    <p className="text-[14px] text-text-secondary line-clamp-2 mt-1 leading-snug">
                      {product.title}
                    </p>

                    {outOfStock ? (
                      <p className="mt-2 text-[13px] text-red-500 font-medium">Нет в наличии</p>
                    ) : qty > 0 ? (
                      <div className="mt-2 flex items-center">
                        <div className="flex items-center bg-[#F4F5F7] rounded-[12px] px-1.5 py-1 min-w-[96px]">
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center text-accent text-[18px] font-medium active:opacity-70"
                            onClick={handleDec}
                          >
                            −
                          </button>
                          <span className="text-[14px] font-semibold text-text-primary px-2 min-w-[24px] text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
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
                        type="button"
                        className="mt-2 h-9 rounded-lg bg-[#F8F8F8] text-[14px] text-text-primary font-medium w-full active:opacity-70"
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
          <span>{formatPriceRub(cartSum)}</span>
        </button>
      )}
    </div>
  )
}
