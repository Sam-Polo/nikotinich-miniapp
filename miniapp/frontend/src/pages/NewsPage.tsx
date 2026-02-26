import { useEffect, useState } from 'react'
import { getContent, getProducts } from '../api'
import type { ContentItem, Product } from '../api'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'

export default function NewsPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  // кэш продуктов для подборок (slug → product)
  const [productCache, setProductCache] = useState<Record<string, Product>>({})

  useEffect(() => {
    getContent()
      .then(async (contentItems) => {
        setItems(contentItems)

        // собираем все нужные slug из подборок
        const slugs = new Set<string>()
        for (const item of contentItems) {
          if (item.type === 'collection') {
            item.productSlugs.forEach(s => slugs.add(s))
          }
        }

        // грузим все товары одним запросом и кэшируем по slug
        if (slugs.size > 0) {
          try {
            const all = await getProducts()
            const cache: Record<string, Product> = {}
            all.forEach(p => { if (slugs.has(p.slug)) cache[p.slug] = p })
            setProductCache(cache)
          } catch { /* нарисуем пустые подборки */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // промо-карточки (акции) — items типа collection с коротким body
  const promos = items.filter(i => i.type === 'collection' && i.body)
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

        {/* горизонтальный скролл промо-акций */}
        {promos.length > 0 && (
          <div className="mb-5">
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
              {promos.map(promo => (
                <div
                  key={promo.id}
                  className="flex-shrink-0 w-[170px] bg-accent rounded-card p-4 text-white"
                >
                  <p className="font-bold text-[15px] leading-tight mb-2">{promo.title}</p>
                  {promo.body && <p className="text-[13px] opacity-85 mb-3">{promo.body}</p>}
                  <button className="text-[13px] font-semibold underline">Применить</button>
                </div>
              ))}
              {/* заглушка-плейсхолдер */}
              <div className="flex-shrink-0 w-[130px] border-2 border-dashed border-gray-300 rounded-card p-4 flex items-center justify-center">
                <p className="text-[12px] text-text-secondary text-center">Скоро здесь будет ещё больше акций</p>
              </div>
            </div>
          </div>
        )}

        {/* новости (лента) */}
        <div className="px-4 space-y-4">
          {newsItems.map(item => (
            <article key={item.id} className="bg-card-bg rounded-card overflow-hidden shadow-sm">
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
            </article>
          ))}

          {/* подборки товаров */}
          {collections.map(col => {
            const colProducts = col.productSlugs.map(s => productCache[s]).filter(Boolean) as Product[]
            if (colProducts.length === 0) return null
            return (
              <section key={col.id}>
                <h2 className="text-[18px] font-bold text-text-primary mb-3">{col.title}</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {colProducts.map(p => (
                    <div key={p.slug} className="flex-shrink-0 w-44">
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
