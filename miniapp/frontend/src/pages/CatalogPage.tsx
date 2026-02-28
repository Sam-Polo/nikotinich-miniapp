import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCategories, getContent } from '../api'
import type { Category, ContentItem } from '../api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [topFeedItems, setTopFeedItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getCategories(),
      getContent().then(items => items.filter((i: ContentItem) => i.showInStories)).catch(() => [])
    ])
      .then(([cats, feed]) => {
        setCategories(cats)
        setTopFeedItems(feed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="shop" />

      <div className="flex-1 px-4 pt-4 pb-24">
        <h1 className="text-[28px] font-bold text-text-primary mb-4">Каталог</h1>

        {/* верхняя лента — элементы с флагом showInStories */}
        {topFeedItems.length > 0 && (
          <div className="mb-5">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {topFeedItems.map(item => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-[170px] bg-accent rounded-card p-4 text-white"
                >
                  <p className="font-bold text-[15px] leading-tight mb-2">{item.title}</p>
                  {item.body && <p className="text-[13px] opacity-85 mb-3 line-clamp-2">{item.body}</p>}
                  {item.type === 'collection' && item.productSlugs.length > 0 && (
                    <Link to={`/collection/${item.id}`} className="text-[13px] font-semibold underline">
                      Смотреть
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
              className="bg-card-bg rounded-card overflow-hidden shadow-sm active:scale-[0.97] transition-transform"
            >
              <div className="aspect-square bg-bg-base">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-4xl">
                    🛒
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
