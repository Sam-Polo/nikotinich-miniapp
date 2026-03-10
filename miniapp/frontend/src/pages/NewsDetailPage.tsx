import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getContent, setContentReaction } from '../api'
import type { ContentItem, ContentReaction } from '../api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import ContentBody from '../components/ContentBody'
import ContentReactions, { type UserReactionState } from '../components/ContentReactions'
import { useUserStore } from '../store/user'

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useUserStore((s) => s.user)
  const userId = user?.telegram_id

  const [item, setItem] = useState<ContentItem | null>(null)
  const [allItems, setAllItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reactionLoading, setReactionLoading] = useState(false)
  const [userReaction, setUserReaction] = useState<UserReactionState>({ like: 0, clap: 0, dislike: 0 })

  const load = useCallback(async () => {
    if (!id) return
    try {
      const list = await getContent()
      setAllItems(list)
      const found = list.find((i: ContentItem) => i.id === id && i.type === 'news') ?? null
      setItem(found)
    } catch {
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleReaction = useCallback(async (reaction: ContentReaction) => {
    if (!id || !userId) return
    setReactionLoading(true)
    try {
      const res = await setContentReaction(id, userId, reaction)
      setItem((prev) => prev ? { ...prev, likes: res.likes, claps: res.claps, dislikes: res.dislikes } : null)
      setUserReaction(res.userReaction)
    } catch {
      // toast при ошибке при желании
    } finally {
      setReactionLoading(false)
    }
  }, [id, userId])

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

  const nextItems = allItems
    .filter((i) => i.id !== item.id)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .slice(0, 4)

  const coverImage = item.imageUrl || (item.images && item.images[0])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-24">
        <article className="bg-card-bg rounded-card overflow-hidden shadow-sm">
          {coverImage ? (
            <img src={coverImage} alt={item.title} className="w-full aspect-video object-cover" />
          ) : (
            <div className="w-full aspect-video bg-bg-base flex items-center justify-center text-text-secondary text-[14px]">
              Нет фото
            </div>
          )}
          <div className="p-4">
            <h1 className="text-[20px] font-bold text-text-primary mb-2 leading-snug">
              {item.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary mb-3">
              {item.publishedAt && (
                <span>
                  {new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {item.readMinutes != null && item.readMinutes > 0 && (
                <>
                  {item.publishedAt && <span>·</span>}
                  <span>{item.readMinutes} мин чтения</span>
                </>
              )}
            </div>
            <ContentReactions
              contentId={item.id}
              userId={userId}
              likes={item.likes ?? 0}
              claps={item.claps ?? 0}
              dislikes={item.dislikes ?? 0}
              userReaction={userReaction}
              onReaction={handleReaction}
              loading={reactionLoading}
              compact
            />
            {item.body && (
              <div className="mt-4">
                <ContentBody body={item.body} images={item.images} />
              </div>
            )}
            <ContentReactions
              contentId={item.id}
              userId={userId}
              likes={item.likes ?? 0}
              claps={item.claps ?? 0}
              dislikes={item.dislikes ?? 0}
              userReaction={userReaction}
              onReaction={handleReaction}
              loading={reactionLoading}
              showDislike
            />
          </div>
        </article>

        {nextItems.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[18px] font-bold text-text-primary mb-3">Следующие статьи</h2>
            <div className="space-y-3">
              {nextItems.map((next) => (
                <Link
                  key={next.id}
                  to={next.type === 'collection' ? `/collection/${next.id}` : `/news/${next.id}`}
                  className="block bg-card-bg rounded-card overflow-hidden shadow-sm"
                >
                  {next.imageUrl || (next.images && next.images[0]) ? (
                    <img
                      src={next.imageUrl || next.images![0]}
                      alt={next.title}
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-bg-base flex items-center justify-center text-text-secondary text-[14px]">
                      Нет фото
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-[16px] font-semibold text-text-primary leading-snug">
                      {next.title}
                    </h3>
                    {next.publishedAt && (
                      <p className="text-[12px] text-text-secondary mt-1">
                        {new Date(next.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
