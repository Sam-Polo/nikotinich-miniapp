import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { CatalogGridSkeleton } from '../components/Skeleton'
import { useCatalogStore } from '../store/catalog'

export default function CatalogPage() {
  const categories = useCatalogStore((s) => s.categories)
  const loading = useCatalogStore((s) => s.loading && !s.loaded && s.categories.length === 0)
  const loadCategories = useCatalogStore((s) => s.loadCategories)
  const navigate = useNavigate()

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 px-4 pt-4 pb-24">
        <h1 className="text-[28px] font-bold text-text-primary mb-4">Каталог</h1>

        {loading && <CatalogGridSkeleton />}

        {!loading && categories.length === 0 && (
          <p className="text-text-secondary text-center mt-10">Категории не найдены</p>
        )}

        {/* сетка категорий 2 колонки; stagger при появлении */}
        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <button
                key={cat.key}
                onClick={() => navigate(`/catalog/${cat.key}`)}
                className="animate-stagger-in rounded-card overflow-hidden active:scale-[0.97] transition-transform duration-150 ease-out bg-card-bg flex flex-col"
                style={{ ['--stagger-i' as string]: `${i * 50}ms` }}
              >
                <div className="aspect-square bg-[#F8F8F8] rounded-card overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-contain p-3 mix-blend-multiply opacity-0 transition-opacity duration-200 data-[loaded]:opacity-100"
                      loading="lazy"
                      onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary text-[13px] bg-[#F8F8F8]">
                      Нет фото
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5 flex items-center justify-center min-h-[40px]">
                  <p className="text-[13px] font-medium text-text-primary text-center leading-snug">
                    {cat.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
