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
      <PageHeader title="Никотиныч" subtitle="shop" />

      <div className="flex-1 px-4 pt-4 pb-[190px]">
        <h1 className="text-[28px] font-bold text-text-primary mb-4">Избранное</h1>

        {/* фильтры по категориям с API */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
          <button
            className="h-8 px-3 rounded-full bg-bg-base border border-border-light flex items-center justify-center text-text-secondary flex-shrink-0 text-[13px]"
            onClick={() => setActiveFilter(null)}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(activeFilter === cat.key ? null : cat.key)}
              className={[
                'h-8 px-3 rounded-full text-[13px] whitespace-nowrap transition-colors flex-shrink-0',
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
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            {filteredItems.map(product => {
              const qty = getQty(product.slug)

              const handleAdd = () => {
                addItem(product)
                setToastImage(product.images[0])
                setShowAddedToast(true)
              }

              const handleInc = () => {
                updateQty(product.slug, qty + 1)
              }

              const handleDec = () => {
                updateQty(product.slug, qty - 1)
              }

              return (
                <div
                  key={product.slug}
                  className="min-w-0"
                >
                  <div
                    className="w-full bg-[#EDEDEF] rounded-[16px] h-[176px] relative overflow-hidden"
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
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(product)
                      }}
                      className="absolute top-3 right-3 text-[#FF4A53] z-10"
                    >
                      <svg width="24" height="22" viewBox="0 0 24 22" fill="none">
                        <path d="M12 20.589c-.333-.208-3.146-2.107-4.78-3.89C5.102 14.386 4 12.79 4 10.8A3.8 3.8 0 0 1 11 8.745 3.8 3.8 0 0 1 18 10.8c0 1.99-1.102 3.586-3.22 5.899-1.634 1.783-4.447 3.682-4.78 3.89z" fill="currentColor" />
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
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-[11px]">
                        Нет фото
                      </div>
                    )}
                  </div>

                  <div className="pt-2 px-0.5">
                    <p className="text-[34px] leading-none font-bold text-[#3D3D42]">
                      {product.display_price.toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="text-[31px] leading-[1.12] text-[#5A5B60] line-clamp-2 mt-1 min-h-[64px]">
                      {product.title}
                    </p>

                    {qty > 0 ? (
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          className="h-9 w-9 rounded-[10px] bg-[#ECECEF] text-[#6A6B70] text-[22px] leading-none"
                          onClick={handleDec}
                        >
                          −
                        </button>
                        <span className="h-9 flex-1 rounded-[10px] bg-[#ECECEF] text-[17px] text-[#4B4D52] flex items-center justify-center">
                          {qty}
                        </span>
                        <button
                          className="h-9 w-9 rounded-[10px] bg-[#ECECEF] text-accent text-[22px] leading-none"
                          onClick={handleInc}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="mt-2 h-9 rounded-[10px] bg-[#ECECEF] text-[#4A4B50] text-[17px] w-full"
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
