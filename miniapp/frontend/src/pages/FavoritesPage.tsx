import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Category } from '../api'
import { useFavoritesStore } from '../store/favorites'
import { useCartStore } from '../store/cart'
import PageHeader from '../components/PageHeader'
import { useCatalogStore } from '../store/catalog'

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

  const cartQty = totalItems()
  const cartSum = subtotal()

  const catalogCategories = useCatalogStore((s) => s.categories)
  const loadCategories = useCatalogStore((s) => s.loadCategories)

  useEffect(() => {
    if (catalogCategories.length === 0) {
      loadCategories()
    }
  }, [catalogCategories.length, loadCategories])

  useEffect(() => {
    setCategories(catalogCategories as Category[])
  }, [catalogCategories])

  useEffect(() => {
    if (!showAddedToast) return
    const tid = window.setTimeout(() => setShowAddedToast(false), ADD_TOAST_MS)
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
        <h1 className="text-[26px] font-bold leading-[130%] text-[#343434] mb-4">Избранное</h1>

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
                'h-[34px] px-[14px] rounded-full text-[14px] whitespace-nowrap transition-colors flex-shrink-0 font-normal leading-[22px] tracking-[-0.5px]',
                activeFilter === cat.key ? 'bg-[#33ADFF] text-white' : 'bg-[#F8F8F8] text-[#595959]'
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
          <div className="grid grid-cols-2 gap-[7px]">
            {filteredItems.map(product => {
              const qty = getQty(product.slug)
              const stock = product.stock
              const canAddMore = stock == null || qty < stock
              const outOfStock = stock !== undefined && stock <= 0

              const handleAdd = (e: React.MouseEvent) => {
                e.stopPropagation()
                if (outOfStock) return
                addItem(product)
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
                  className="min-w-0 bg-white"
                >
                  <div
                    className="w-full aspect-square bg-[#F8F8F8] rounded-[22px] relative overflow-hidden"
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
                      className="absolute top-[10px] right-[10px] z-10 text-[#FF4545]"
                      aria-label="Удалить из избранного"
                    >
                      <svg width="28" height="28" viewBox="0 0 24 22" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-contain p-3 mix-blend-multiply"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-[12px]">
                        Нет фото
                      </div>
                    )}
                  </div>

                  <div className="pt-[10px]">
                    <p className="text-[18px] font-bold leading-[110%] text-[#434343]">
                      {formatRub(product.display_price)}
                    </p>
                    <p className="text-[14px] font-medium leading-[110%] text-[#797979] line-clamp-2 mt-[5px] min-h-[32px]">
                      {product.title}
                    </p>

                    {outOfStock ? (
                      <p className="mt-[14px] h-[44px] rounded-[10px] bg-[#F8F8F8] text-[13px] text-[#595959] font-medium flex items-center justify-center">
                        Нет в наличии
                      </p>
                    ) : qty > 0 ? (
                      <div className="mt-[14px] flex items-center">
                        <div className="w-full h-[44px] rounded-[10px] bg-[#F8F8F8] px-[10px] flex items-center justify-between">
                          <button
                            type="button"
                            className="w-5 h-5 flex items-center justify-center text-[#595959] text-[24px] leading-none active:opacity-70"
                            onClick={handleDec}
                          >
                            −
                          </button>
                          <span className="text-[16px] font-medium leading-[19px] text-[#595959] min-w-[24px] text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            className="w-5 h-5 flex items-center justify-center text-[#258CD1] text-[24px] leading-none active:opacity-70 disabled:opacity-50"
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
                        className="mt-[14px] h-[44px] rounded-[10px] bg-[#F8F8F8] text-[#595959] font-medium w-full active:opacity-70 leading-none"
                        onClick={handleAdd}
                      >
                        <span className="text-[13px] leading-[16px]">В корзину</span>
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
        <div
          className="fixed left-4 right-4 z-[65] flex justify-center pointer-events-none"
          style={{ bottom: 'calc(141px + env(safe-area-inset-bottom, 0px))' }}
        >
          <AddedToCartToast durationMs={ADD_TOAST_MS} />
        </div>
      )}

      {cartQty > 0 && (
        <div
          className="fixed left-0 right-0 px-4 z-[60]"
          style={{ bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            className="w-full h-[55px] rounded-[18px] bg-[#0099FF] px-[18px] flex items-center justify-between active:opacity-90"
            onClick={() => navigate('/cart')}
          >
            <span className="text-[14px] font-semibold leading-[17px] text-white opacity-80">{getItemsLabel(cartQty)}</span>
            <span className="text-[16px] font-semibold leading-[19px] text-white">Перейти в корзину</span>
            <span className="text-[14px] font-semibold leading-[17px] text-white opacity-80">{formatRub(cartSum)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
