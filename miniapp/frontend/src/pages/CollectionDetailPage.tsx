import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getContentReaction, getProducts, setContentReaction } from '../api'
import type { ContentItem, ContentReaction, Product } from '../api'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import ContentBody from '../components/ContentBody'
import ContentReactions, { type UserReactionState } from '../components/ContentReactions'
import { useUserStore } from '../store/user'
import { useContentStore } from '../store/content'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useUserStore((s) => s.user)
  const userId = user?.telegram_id
  const loadContent = useContentStore((s) => s.loadContent)
  const contentItems = useContentStore((s) => s.contentItems)
  const updateItemCounts = useContentStore((s) => s.updateItemCounts)

  const [collection, setCollection] = useState<ContentItem | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [userReaction, setUserReaction] = useState<UserReactionState>({ like: 0, clap: 0, dislike: 0 })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    loadContent().then(async () => {
      if (cancelled) return
      const items = useContentStore.getState().contentItems
      const col = items.find((i) => i.id === id && i.type === 'collection') ?? null
      setCollection(col ?? null)
      if (col?.productSlugs?.length) {
        try {
          const prods = await getProducts({ slugs: col.productSlugs })
          if (!cancelled) setProducts(prods)
        } catch {
          if (!cancelled) setProducts([])
        }
      } else {
        setProducts([])
      }
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, loadContent])

  // загрузка своей реакции при открытии подборки (чтобы подсветка сохранялась после возврата)
  useEffect(() => {
    if (!collection?.id || !userId) return
    getContentReaction(collection.id, userId)
      .then((data) => setUserReaction(data.userReaction))
      .catch(() => {})
  }, [collection?.id, userId])

  const handleReaction = useCallback((reaction: ContentReaction) => {
    if (!id || !userId) return
    const prev = userReaction
    let nextUser: UserReactionState
    let deltaLike = 0, deltaClap = 0, deltaDislike = 0
    if (reaction === 'dislike') {
      const newDislike = prev.dislike ? 0 : 1
      deltaLike = -prev.like
      deltaClap = -prev.clap
      deltaDislike = newDislike - prev.dislike
      nextUser = { like: 0, clap: 0, dislike: newDislike }
    } else if (reaction === 'like') {
      const newLike = prev.like ? 0 : 1
      deltaLike = newLike - prev.like
      deltaDislike = -prev.dislike
      nextUser = { like: newLike, clap: prev.clap, dislike: 0 }
    } else {
      const newClap = prev.clap ? 0 : 1
      deltaClap = newClap - prev.clap
      deltaDislike = -prev.dislike
      nextUser = { like: prev.like, clap: newClap, dislike: 0 }
    }
    const newLikes = Math.max(0, (collection?.likes ?? 0) + deltaLike)
    const newClaps = Math.max(0, (collection?.claps ?? 0) + deltaClap)
    const newDislikes = Math.max(0, (collection?.dislikes ?? 0) + deltaDislike)
    setUserReaction(nextUser)
    setCollection((prevCol) => prevCol ? {
      ...prevCol,
      likes: newLikes,
      claps: newClaps,
      dislikes: newDislikes
    } : null)
    updateItemCounts(id, { likes: newLikes, claps: newClaps, dislikes: newDislikes })
    // отправка на сервер в фоне; состояние не перезаписываем ответом — только локально, при ошибке откат
    setContentReaction(id, userId, reaction).catch(() => {
      setUserReaction(prev)
      setCollection((prevCol) => prevCol ? {
        ...prevCol,
        likes: (prevCol.likes ?? 0) - deltaLike,
        claps: (prevCol.claps ?? 0) - deltaClap,
        dislikes: (prevCol.dislikes ?? 0) - deltaDislike
      } : null)
    })
  }, [id, userId, userReaction, collection, updateItemCounts])

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

  if (!collection) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <p className="text-text-secondary text-center mt-10 px-4">Подборка не найдена</p>
      </div>
    )
  }

  const nextItems = contentItems
    .filter((i) => i.id !== collection.id)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .slice(0, 4)

  const coverImage = collection.imageUrl || (collection.images && collection.images[0])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-24">
        <article className="bg-card-bg rounded-card overflow-hidden shadow-sm mb-6">
          {coverImage ? (
            <img src={coverImage} alt={collection.title} className="w-full aspect-video object-cover" />
          ) : (
            <div className="w-full aspect-video bg-bg-base flex items-center justify-center text-text-secondary text-[14px]">
              Нет фото
            </div>
          )}
          <div className="p-4">
            <h1 className="text-[20px] font-bold text-text-primary mb-2 leading-snug">
              {collection.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary mb-3">
              {collection.publishedAt && (
                <span>
                  {new Date(collection.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {collection.readMinutes != null && collection.readMinutes > 0 && (
                <>
                  {collection.publishedAt && <span>·</span>}
                  <span>{collection.readMinutes} мин чтения</span>
                </>
              )}
            </div>
            <ContentReactions
              contentId={collection.id}
              userId={userId}
              likes={collection.likes ?? 0}
              claps={collection.claps ?? 0}
              dislikes={collection.dislikes ?? 0}
              userReaction={userReaction}
              onReaction={handleReaction}
              compact
            />
            {collection.body && (
              <div className="mt-4">
                <ContentBody body={collection.body} images={collection.images} />
              </div>
            )}
            <ContentReactions
              contentId={collection.id}
              userId={userId}
              likes={collection.likes ?? 0}
              claps={collection.claps ?? 0}
              dislikes={collection.dislikes ?? 0}
              userReaction={userReaction}
              onReaction={handleReaction}
              showDislike
            />
          </div>
        </article>

        <h2 className="text-[18px] font-bold text-text-primary mb-3">Товары в подборке</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
        {products.length === 0 && (
          <p className="text-text-secondary text-center mt-10">В подборке пока нет товаров</p>
        )}

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
