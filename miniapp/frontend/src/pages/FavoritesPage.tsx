import { useFavoritesStore } from '../store/favorites'
import { useCartStore } from '../store/cart'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function FavoritesPage() {
  const { items, clearAll, toggle } = useFavoritesStore()
  const addItem = useCartStore(s => s.addItem)
  const getQty = useCartStore(s => s.getQty)
  const updateQty = useCartStore(s => s.updateQty)
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader
        title="Избранное"
        right={
          items.length > 0 ? (
            <button onClick={clearAll} className="p-2 text-text-secondary active:opacity-70">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2m-6 5v6m4-6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 px-4 pt-4 pb-24">
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

        {items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map(product => {
              const qty = getQty(product.slug)
              
              const handleAdd = (e: React.MouseEvent) => {
                e.stopPropagation()
                addItem(product)
                toast.success('Добавлено в корзину', { id: `cart-${product.slug}` })
              }
              
              const handleInc = (e: React.MouseEvent) => {
                e.stopPropagation()
                updateQty(product.slug, qty + 1)
              }
              
              const handleDec = (e: React.MouseEvent) => {
                e.stopPropagation()
                updateQty(product.slug, qty - 1)
              }

              return (
                <div 
                  key={product.slug}
                  className="flex p-3 bg-card-bg rounded-card border border-border-light cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => navigate(`/product/${product.slug}`)}
                >
                  {/* Левая часть: Изображение */}
                  <div className="w-[84px] h-[84px] bg-bg-base rounded-[10px] flex-shrink-0 relative overflow-hidden">
                    {product.images[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.title} 
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-[10px]">
                        Нет фото
                      </div>
                    )}
                  </div>

                  {/* Правая часть: Информация */}
                  <div className="ml-3 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start">
                        <p className="text-[12px] text-text-secondary leading-none mt-1 line-clamp-1">
                          {product.category || product.brand || 'Товар'}
                        </p>
                        <button 
                          className="text-text-secondary p-1 -mt-1 -mr-1 active:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(product)
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-[14px] text-text-primary font-medium leading-tight mt-1 line-clamp-2 pr-4">
                        {product.title}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="font-bold text-[16px]">
                        {product.display_price.toLocaleString('ru-RU')} ₽
                      </div>
                      
                      {qty > 0 ? (
                        <div 
                          className="flex items-center justify-between bg-bg-base rounded-btn px-2 py-1 min-w-[80px]"
                          onClick={e => e.stopPropagation()}
                        >
                          <button 
                            className="w-6 h-6 flex items-center justify-center text-accent text-[18px] font-medium"
                            onClick={handleDec}
                          >
                            −
                          </button>
                          <span className="text-[14px] font-semibold text-text-primary px-2">{qty}</span>
                          <button 
                            className="w-6 h-6 flex items-center justify-center text-accent text-[18px] font-medium"
                            onClick={handleInc}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="bg-accent text-white px-4 py-1.5 rounded-btn text-[13px] font-medium active:opacity-80 transition-opacity"
                          onClick={handleAdd}
                        >
                          В корзину
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <Button
              variant="primary"
              fullWidth
              className="mt-4"
              onClick={() => {
                items.forEach(p => {
                  if (getQty(p.slug) === 0) addItem(p)
                })
                toast.success('Товары добавлены в корзину')
              }}
            >
              Добавить всё в корзину
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
