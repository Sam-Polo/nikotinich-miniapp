import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getContentReaction, getProducts, setContentReaction } from '../api'
import type { ContentItem, ContentReaction, Product } from '../api'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import ContentBody from '../components/ContentBody'
import { ContentDetailSkeleton } from '../components/Skeleton'
import ContentReactions from '../components/ContentReactions'
import { useUserStore } from '../store/user'
import { useContentStore, type UserReactionState } from '../store/content'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useUserStore((s) => s.user)
  const userId = user?.telegram_id
  const loadContent = useContentStore((s) => s.loadContent)
  const contentItems = useContentStore((s) => s.contentItems)
  const updateItemCounts = useContentStore((s) => s.updateItemCounts)
  const userReactions = useContentStore((s) => s.userReactions)
  const setUserReactionInStore = useContentStore((s) => s.setUserReaction)

  const [collection, setCollection] = useState<ContentItem | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleProductsCount, setVisibleProductsCount] = useState(4)

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
      .then((data) => setUserReactionInStore(collection.id, data.userReaction))
      .catch(() => {})
  }, [collection?.id, userId, setUserReactionInStore])

  const handleReaction = useCallback((reaction: ContentReaction) => {
    if (!id || !userId || !collection) return
    const prev = userReactions[collection.id] ?? { like: 0, clap: 0, dislike: 0 }
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
    const newLikes = Math.max(0, (collection.likes ?? 0) + deltaLike)
    const newClaps = Math.max(0, (collection.claps ?? 0) + deltaClap)
    const newDislikes = Math.max(0, (collection.dislikes ?? 0) + deltaDislike)
    setUserReactionInStore(collection.id, nextUser)
    setCollection((prevCol) => prevCol ? {
      ...prevCol,
      likes: newLikes,
      claps: newClaps,
      dislikes: newDislikes
    } : null)
    updateItemCounts(id, { likes: newLikes, claps: newClaps, dislikes: newDislikes })
    // отправка на сервер в фоне; состояние не перезаписываем ответом — только локально, при ошибке откат
    setContentReaction(id, userId, reaction).catch(() => {
      setUserReactionInStore(collection.id, prev)
      setCollection((prevCol) => prevCol ? {
        ...prevCol,
        likes: (prevCol.likes ?? 0) - deltaLike,
        claps: (prevCol.claps ?? 0) - deltaClap,
        dislikes: (prevCol.dislikes ?? 0) - deltaDislike
      } : null)
    })
  }, [id, userId, collection, userReactions, updateItemCounts, setUserReactionInStore])

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <ContentDetailSkeleton />
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
    .slice(0, 2)

  const coverImage = collection.imageUrl || (collection.images && collection.images[0])
  const userReaction = userReactions[collection.id] ?? { like: 0, clap: 0, dislike: 0 }
  const visibleProducts = products.slice(0, visibleProductsCount)

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 pt-4 pb-24">
        <article className="w-full">
          <div className="px-5 pb-4">
            <h1 className="text-[26px] font-bold leading-[110%] text-[#343434] mb-5">
              {collection.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-[#8D8D8D] mb-4">
              {collection.publishedAt && (
                <span>
                  {new Date(collection.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {collection.readMinutes != null && collection.readMinutes > 0 && (
                <>
                  {collection.publishedAt && <span>•</span>}
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
          </div>

          {coverImage ? (
            <img src={coverImage} alt={collection.title} className="w-full h-auto max-h-[320px] object-cover" />
          ) : (
            <div className="w-full aspect-video bg-bg-base flex items-center justify-center text-text-secondary text-[14px]">
              Нет фото
            </div>
          )}

          {collection.body && (
            <div className="px-5 pt-4">
              <ContentBody body={collection.body} images={collection.images} />
            </div>
          )}

          <div className="px-5 pt-3">
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

        <div className="px-4 mt-6">
          <h2 className="text-[18px] font-bold text-text-primary mb-3">Товары в подборке</h2>
          {products.length === 0 ? (
            <p className="text-text-secondary text-center mt-10">В подборке пока нет товаров</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {visibleProducts.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
              {visibleProductsCount < products.length && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="h-[44px] px-4 rounded-[12px] bg-[#F8F8F8] text-[14px] font-semibold text-text-primary active:opacity-80"
                    onClick={() =>
                      setVisibleProductsCount((prev) => Math.min(prev + 10, products.length))
                    }
                  >
                    Больше товаров
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {nextItems.length > 0 && (
          <section className="mt-8 border-t border-[#F4F4F4] pt-5 flex flex-col items-center gap-5">
            <div className="px-5 flex flex-col items-center gap-2">
              <h2 className="text-[16px] font-semibold text-[#343434] text-center">
                Следующие статьи
              </h2>
            </div>
            <div className="flex flex-col gap-3 px-4 w-full items-center">
              {nextItems.map((next) => (
                <Link
                  key={next.id}
                  to={next.type === 'collection' ? `/collection/${next.id}` : `/news/${next.id}`}
                  className="w-full max-w-[361px] bg-white rounded-[22px] shadow-[0_4px_40px_rgba(0,0,0,0.06)] flex items-start gap-[14px] p-[10px]"
                >
                  <div className="flex-1 flex flex-col gap-[14px]">
                    <div className="flex flex-col gap-2 px-[5px] pt-[10px] pb-0">
                      <h3 className="text-[14px] font-bold text-[#343434] leading-[110%] line-clamp-2">
                        {next.title}
                      </h3>
                      <div className="flex items-center gap-[6px] text-[12px] text-[#8D8D8D]">
                        {next.publishedAt && (
                          <span>
                            {new Date(next.publishedAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                        {next.publishedAt && next.readMinutes != null && next.readMinutes > 0 && (
                          <>
                            <span className="w-[2px] h-[2px] rounded-full bg-[#8D8D8D]" />
                            <span>{next.readMinutes} минут чтения</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {(next.imageUrl || (next.images && next.images[0])) && (
                    <img
                      src={next.imageUrl || next.images![0]}
                      alt={next.title}
                      className="w-[100px] h-[100px] rounded-[12px] object-cover flex-shrink-0"
                    />
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
