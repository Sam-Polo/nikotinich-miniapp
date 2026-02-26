import { useFavoritesStore } from '../store/favorites'
import { useCartStore } from '../store/cart'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import Button from '../components/Button'

export default function FavoritesPage() {
  const { items, clearAll } = useFavoritesStore()
  const addItem = useCartStore(s => s.addItem)

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader
        title="Никотиныч"
        subtitle="mini app"
        right={
          items.length > 0 ? (
            <button onClick={clearAll} className="text-destructive text-[14px]">Очистить</button>
          ) : undefined
        }
      />

      <div className="flex-1 px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold text-text-primary">Избранное</h1>
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

        {items.length > 0 && (
          <>
            {/* кнопка добавить все в корзину */}
            <Button
              variant="secondary"
              fullWidth
              className="mb-4"
              onClick={() => items.forEach(p => addItem(p))}
            >
              Добавить всё в корзину
            </Button>

            <div className="grid grid-cols-2 gap-3">
              {items.map(p => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
