import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories } from '../api'
import type { Category } from '../api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 px-4 pt-4 pb-24">
        <h1 className="text-[28px] font-bold text-text-primary mb-4">Каталог</h1>

        {loading && <Spinner />}

        {!loading && categories.length === 0 && (
          <p className="text-text-secondary text-center mt-10">Категории не найдены</p>
        )}

        {/* сетка категорий 2 колонки как на макете */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => navigate(`/catalog/${cat.key}`)}
              className="rounded-card overflow-hidden active:scale-[0.97] transition-transform"
            >
              <div className="aspect-square bg-bg-base rounded-card overflow-hidden">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-contain p-3 mix-blend-multiply"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-[13px] bg-bg-base">
                    Нет фото
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[14px] font-medium text-text-primary text-center">{cat.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
