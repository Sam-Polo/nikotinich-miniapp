import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getContent, getProducts } from '../api'
import type { ContentItem, Product } from '../api'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [collection, setCollection] = useState<ContentItem | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getContent()
      .then(async (items) => {
        const col = items.find((i: ContentItem) => i.id === id && i.type === 'collection')
        if (!col) return
        setCollection(col)
        if (col.productSlugs.length > 0) {
          const prods = await getProducts({ slugs: col.productSlugs })
          setProducts(prods)
        }
      })
      .catch(() => {})
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

  if (!collection) {
    return (
      <div className="flex flex-col min-h-full bg-bg-base">
        <PageHeader title="Никотиныч" subtitle="mini app" showBack />
        <p className="text-text-secondary text-center mt-10 px-4">Подборка не найдена</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-24">
        {/* статья (фото + текст) как в каталоге/новостях */}
        {/* полное описание подборки: фото, дата, весь текст */}
        <article className="bg-card-bg rounded-card overflow-hidden shadow-sm mb-6">
          {collection.imageUrl && (
            <img
              src={collection.imageUrl}
              alt={collection.title}
              className="w-full aspect-video object-cover"
            />
          )}
          <div className="p-4">
            <h1 className="text-[20px] font-bold text-text-primary mb-2 leading-snug">
              {collection.title}
            </h1>
            {collection.publishedAt && (
              <p className="text-[13px] text-text-secondary mb-3">
                {new Date(collection.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {collection.body && (
              <p className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                {collection.body}
              </p>
            )}
          </div>
        </article>

        {/* товары подборки */}
        <h2 className="text-[18px] font-bold text-text-primary mb-3">Товары в подборке</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>

        {products.length === 0 && (
          <p className="text-text-secondary text-center mt-10">В подборке пока нет товаров</p>
        )}
      </div>
    </div>
  )
}
