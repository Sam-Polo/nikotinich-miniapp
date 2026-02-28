import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getContent } from '../api'
import type { ContentItem } from '../api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

// полное окно новости: фото, дата, полное описание (единый стиль с подборкой, без миникаталога)
export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getContent()
      .then(list => {
        const found = list.find((i: ContentItem) => i.id === id && i.type === 'news') ?? null
        setItem(found)
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <p className="text-text-secondary text-center mt-10 px-4">Новость не найдена</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-24">
        <article className="bg-card-bg rounded-card overflow-hidden shadow-sm">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full aspect-video object-cover"
            />
          )}
          <div className="p-4">
            <h1 className="text-[20px] font-bold text-text-primary mb-2 leading-snug">
              {item.title}
            </h1>
            {item.publishedAt && (
              <p className="text-[13px] text-text-secondary mb-3">
                {new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {item.body && (
              <p className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                {item.body}
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
