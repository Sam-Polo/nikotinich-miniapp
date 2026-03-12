import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import { useContentStore } from '../store/content'

export default function NewsPage() {
  const contentItems = useContentStore((s) => s.contentItems)
  const loadContent = useContentStore((s) => s.loadContent)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContent().finally(() => setLoading(false))
  }, [loadContent])

  const items = contentItems
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

        {/* верхняя лента — только в разделе новостей; по клику открывается полная страница */}
        {topFeedItems.length > 0 && (
          <div className="mb-5">
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
              {topFeedItems.map(item => (
                <Link
                  key={item.id}
                  to={item.type === 'collection' ? `/collection/${item.id}` : `/news/${item.id}`}
                  className="flex-shrink-0 w-[170px] bg-accent rounded-card p-4 text-white block active:opacity-90"
                >
                  <p className="font-bold text-[15px] leading-tight mb-2">{item.title}</p>
                  {item.body && <p className="text-[13px] opacity-85 mb-3 line-clamp-2">{item.body}</p>}
                  <span className="text-[13px] font-semibold underline">Смотреть</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* новости и подборки в ленте — только карточка (фото + заголовок + превью), по клику открывается полное описание */}
        <div className="px-4 space-y-4">
          {newsItems.map(item => (
            <Link key={item.id} to={`/news/${item.id}`} className="block bg-card-bg rounded-card overflow-hidden shadow-sm">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-bg-base flex items-center justify-center text-text-secondary text-[14px]">
                  Нет фото
                </div>
              )}
              <div className="p-4">
                <h2 className="text-[16px] font-semibold text-text-primary mb-1 leading-snug">
                  {item.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-text-secondary mb-2">
                  {item.publishedAt && (
                    <span>{new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  )}
                  {item.readMinutes != null && item.readMinutes > 0 && (
                    <>
                      {item.publishedAt && <span>·</span>}
                      <span>{item.readMinutes} мин</span>
                    </>
                  )}
                  {((item.likes ?? 0) > 0 || (item.claps ?? 0) > 0) && (
                    <>
                      <span>·</span>
                      <span>❤ {(item.likes ?? 0)} · 👏 {(item.claps ?? 0)}</span>
                    </>
                  )}
                </div>
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
              {col.imageUrl ? (
                <img
                  src={col.imageUrl}
                  alt={col.title}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-bg-base flex items-center justify-center text-text-secondary text-[14px]">
                  Нет фото
                </div>
              )}
              <div className="p-4">
                <h2 className="text-[16px] font-semibold text-text-primary mb-1 leading-snug">
                  {col.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-text-secondary mb-2">
                  {col.publishedAt && (
                    <span>{new Date(col.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  )}
                  {col.readMinutes != null && col.readMinutes > 0 && (
                    <>
                      {col.publishedAt && <span>·</span>}
                      <span>{col.readMinutes} мин</span>
                    </>
                  )}
                  {((col.likes ?? 0) > 0 || (col.claps ?? 0) > 0) && (
                    <>
                      <span>·</span>
                      <span>❤ {(col.likes ?? 0)} · 👏 {(col.claps ?? 0)}</span>
                    </>
                  )}
                </div>
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
