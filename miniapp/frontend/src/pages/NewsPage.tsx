import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getContent } from '../api'
import type { ContentItem } from '../api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

export default function NewsPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getContent()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // верхняя лента — только элементы с флагом showInStories (новости и подборки)
  const topFeedItems = items.filter(i => i.showInStories)
  const newsItems = items.filter(i => i.type === 'news')
  const collections = items.filter(i => i.type === 'collection')

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" />

      <div className="flex-1 pb-24">
        <div className="px-4 pt-4">
          <h1 className="text-[28px] font-bold text-text-primary mb-4">Новости</h1>
        </div>

        {loading && <Spinner />}

        {!loading && items.length === 0 && (
          <p className="text-text-secondary text-center mt-10">Скоро здесь будет контент</p>
        )}

        {/* верхняя лента — элементы с флагом showInStories */}
        {topFeedItems.length > 0 && (
          <div className="mb-5">
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
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

        {/* новости и подборки в ленте — только карточка (фото + заголовок + превью), по клику открывается полное описание */}
        <div className="px-4 space-y-4">
          {newsItems.map(item => (
            <Link key={item.id} to={`/news/${item.id}`} className="block bg-card-bg rounded-card overflow-hidden shadow-sm">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-[16px] font-semibold text-text-primary mb-1 leading-snug">
                  {item.title}
                </h2>
                {item.publishedAt && (
                  <p className="text-[12px] text-text-secondary mb-2">
                    {new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {item.body && (
                  <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3">
                    {item.body}
                  </p>
                )}
              </div>
            </Link>
          ))}

          {/* подборки в ленте — только карточка, без мини-каталога; полный вид и товары внутри подборки */}
          {collections.map(col => (
            <Link key={col.id} to={`/collection/${col.id}`} className="block bg-card-bg rounded-card overflow-hidden shadow-sm">
              {col.imageUrl && (
                <img
                  src={col.imageUrl}
                  alt={col.title}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-[16px] font-semibold text-text-primary mb-1 leading-snug">
                  {col.title}
                </h2>
                {col.body && (
                  <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3">
                    {col.body}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
