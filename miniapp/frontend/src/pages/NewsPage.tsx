import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import ContentReactions from '../components/ContentReactions'
import { useContentStore, type UserReactionState } from '../store/content'
import { useUserStore } from '../store/user'
import type { ContentReaction } from '../api'

function bodyPreview(body?: string, maxLen = 150) {
  if (!body) return ''
  const plain = body
    // убираем маркеры встроенных картинок
    .replace(/\{\{img\d+\}\}/gi, ' ')
    // markdown заголовки/списки
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // markdown ссылки [text](url) -> text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // жирный/курсив/инлайн-код
    .replace(/[*_`~]/g, '')
    // нормализуем пробелы
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen).trimEnd()}...`
}

export default function NewsPage() {
  const contentItems = useContentStore((s) => s.contentItems)
  const loadContent = useContentStore((s) => s.loadContent)
  const updateItemCounts = useContentStore((s) => s.updateItemCounts)
  const userReactions = useContentStore((s) => s.userReactions)
  const mergeUserReactions = useContentStore((s) => s.mergeUserReactions)
  const setUserReactionInStore = useContentStore((s) => s.setUserReaction)
  const user = useUserStore((s) => s.user)
  const userId = user?.telegram_id
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContent().finally(() => setLoading(false))
  }, [loadContent])

  const items = contentItems
  const topFeedItems = items.filter(i => i.showInStories)
  const newsItems = items.filter(i => i.type === 'news')
  const collections = items.filter(i => i.type === 'collection')

  useEffect(() => {
    if (!userId || items.length === 0) return
    let cancelled = false

    const loadReactions = async () => {
      try {
        const { getContentReaction } = await import('../api')
        const ids = Array.from(
          new Set([
            ...newsItems.map(i => i.id),
            ...collections.map(i => i.id)
          ])
        )

        const results = await Promise.allSettled(
          ids.map(id => getContentReaction(id, userId))
        )

        if (cancelled) return

        const next: Record<string, UserReactionState> = {}
        results.forEach((res, index) => {
          if (res.status === 'fulfilled') {
            next[ids[index]] = res.value.userReaction
          }
        })

        mergeUserReactions(next)
      } catch {
        // игнорируем ошибки загрузки реакций, лента всё равно продолжит работать
      }
    }

    loadReactions()

    return () => {
      cancelled = true
    }
  }, [userId, items, newsItems, collections, mergeUserReactions])

  const handleReaction = useCallback(
    async (contentId: string, reaction: ContentReaction) => {
      if (!userId) return
      const prevUser = userReactions[contentId] ?? { like: 0, clap: 0, dislike: 0 }
      const item = items.find(i => i.id === contentId)
      if (!item) return

      let nextUser: UserReactionState = prevUser
      let deltaLike = 0, deltaClap = 0, deltaDislike = 0

      if (reaction === 'dislike') {
        const newDislike = prevUser.dislike ? 0 : 1
        deltaLike = -prevUser.like
        deltaClap = -prevUser.clap
        deltaDislike = newDislike - prevUser.dislike
        nextUser = { like: 0, clap: 0, dislike: newDislike }
      } else if (reaction === 'like') {
        const newLike = prevUser.like ? 0 : 1
        deltaLike = newLike - prevUser.like
        deltaDislike = -prevUser.dislike
        nextUser = { like: newLike, clap: prevUser.clap, dislike: 0 }
      } else {
        const newClap = prevUser.clap ? 0 : 1
        deltaClap = newClap - prevUser.clap
        deltaDislike = -prevUser.dislike
        nextUser = { like: prevUser.like, clap: newClap, dislike: 0 }
      }

      const newLikes = Math.max(0, (item.likes ?? 0) + deltaLike)
      const newClaps = Math.max(0, (item.claps ?? 0) + deltaClap)
      const newDislikes = Math.max(0, (item.dislikes ?? 0) + deltaDislike)

      setUserReactionInStore(contentId, nextUser)
      updateItemCounts(contentId, { likes: newLikes, claps: newClaps, dislikes: newDislikes })

      try {
        const { setContentReaction } = await import('../api')
        await setContentReaction(contentId, userId, reaction)
      } catch {
        // откат при ошибке
        setUserReactionInStore(contentId, prevUser)
        updateItemCounts(contentId, {
          likes: item.likes ?? 0,
          claps: item.claps ?? 0,
          dislikes: item.dislikes ?? 0
        })
      }
    },
    [items, updateItemCounts, userId, userReactions, setUserReactionInStore]
  )

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
                  className="flex-shrink-0 w-[170px] bg-accent rounded-card p-4 text-white flex flex-col justify-between active:opacity-90"
                >
                  <div className="flex-1 flex flex-col">
                    <p className="font-bold text-[15px] leading-tight mb-2">{item.title}</p>
                    {item.body && <p className="text-[13px] opacity-85 line-clamp-2">{item.body}</p>}
                  </div>
                  <span className="mt-3 text-[13px] font-semibold underline">Смотреть</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* новости и подборки в ленте — карточки */}
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
                </div>
                {item.body && <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3">{bodyPreview(item.body)}</p>}
                <div className="mt-3">
                  <ContentReactions
                    contentId={item.id}
                    userId={userId}
                    likes={item.likes ?? 0}
                    claps={item.claps ?? 0}
                    dislikes={item.dislikes ?? 0}
                    userReaction={userReactions[item.id] ?? { like: 0, clap: 0, dislike: 0 }}
                    onReaction={(reaction) => handleReaction(item.id, reaction)}
                    compact
                  />
                </div>
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
                </div>
                {col.body && <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3">{bodyPreview(col.body)}</p>}
                <div className="mt-3">
                  <ContentReactions
                    contentId={col.id}
                    userId={userId}
                    likes={col.likes ?? 0}
                    claps={col.claps ?? 0}
                    dislikes={col.dislikes ?? 0}
                    userReaction={userReactions[col.id] ?? { like: 0, clap: 0, dislike: 0 }}
                    onReaction={(reaction) => handleReaction(col.id, reaction)}
                    compact
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
