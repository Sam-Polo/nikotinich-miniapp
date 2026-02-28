import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getBrands, getLines, getProducts } from '../api'
import type { Brand, Line, Product } from '../api'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import BottomSheet from '../components/BottomSheet'
import SelectionList from '../components/SelectionList'
import Button from '../components/Button'
import Spinner from '../components/Spinner'

// шаги выбора фильтра
type Step = 'brand' | 'line' | 'products'

export default function CategoryPage() {
  const { categoryKey = '' } = useParams<{ categoryKey: string }>()

  const [brands, setBrands] = useState<Brand[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('brand')

  const [loading, setLoading] = useState(true)
  const [brandsSheet, setBrandsSheet] = useState(false)
  const [linesSheet, setLinesSheet] = useState(false)

  const categoryTitle = categoryKey.replace(/_/g, ' ')

  // загрузка брендов при открытии категории
  useEffect(() => {
    getBrands(categoryKey)
      .then(b => {
        setBrands(b)
        // если брендов нет — сразу грузим все товары категории
        if (b.length === 0) {
          loadProducts()
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [categoryKey])

  // загрузка линеек при выборе бренда
  useEffect(() => {
    if (!selectedBrand) return
    getLines(selectedBrand).then(l => {
      setLines(l)
      if (l.length === 0) {
        // нет линеек — сразу грузим товары бренда
        loadProducts(selectedBrand, undefined)
      }
    })
  }, [selectedBrand])

  function loadProducts(brand?: string, line?: string) {
    setLoading(true)
    getProducts({ category: categoryKey, brand, line })
      .then(setProducts)
      .catch(() => {})
      .finally(() => { setLoading(false); setStep('products') })
  }

  function handleBrandSelect(key: string) {
    setSelectedBrand(key)
    setBrandsSheet(false)
    setStep('line')
  }

  function handleLineSelect(key: string) {
    setSelectedLine(key)
    setLinesSheet(false)
    loadProducts(selectedBrand!, key)
  }

  const brandTitle = brands.find(b => b.key === selectedBrand)?.title
  const lineTitle = lines.find(l => l.key === selectedLine)?.title

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="shop" showBack />

      <div className="flex-1 px-4 pt-4 pb-24">
        {/* хлебные крошки */}
        <div className="flex items-center gap-1 mb-3">
          {brandTitle && (
            <button
              onClick={() => { setSelectedBrand(null); setSelectedLine(null); setStep('brand'); setBrandsSheet(true) }}
              className="text-accent text-[13px]"
            >
              {brandTitle}
            </button>
          )}
          {brandTitle && lineTitle && <span className="text-text-secondary text-[13px]">/</span>}
          {lineTitle && (
            <button
              onClick={() => { setSelectedLine(null); setLinesSheet(true) }}
              className="text-accent text-[13px]"
            >
              {lineTitle}
            </button>
          )}
        </div>

        {/* бренды — одна колонка, стиль как у категорий (карточка с картинкой и названием) */}
        {step === 'brand' && !loading && brands.length > 0 && (
          <>
            <p className="text-accent text-[13px] font-medium">{categoryTitle}</p>
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите бренд</h1>
            <div className="grid grid-cols-1 gap-3">
              {brands.map(b => (
                <button
                  key={b.key}
                  onClick={() => handleBrandSelect(b.key)}
                  className={`bg-card-bg rounded-card overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform ${selectedBrand === b.key ? 'ring-2 ring-accent' : ''}`}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-[10px] bg-bg-base flex-shrink-0 overflow-hidden">
                      {b.image ? (
                        <img src={b.image} alt={b.title} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-xl">{b.title[0]}</div>
                      )}
                    </div>
                    <p className="text-[16px] font-medium text-text-primary flex-1">{b.title}</p>
                    {selectedBrand === b.key && (
                      <svg className="w-5 h-5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* линейки — одна колонка, тот же стиль карточек */}
        {step === 'line' && !loading && lines.length > 0 && (
          <>
            <p className="text-accent text-[13px] font-medium">{brandTitle}</p>
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите линейку</h1>
            <div className="grid grid-cols-1 gap-3">
              {lines.map(l => (
                <button
                  key={l.key}
                  onClick={() => handleLineSelect(l.key)}
                  className={`bg-card-bg rounded-card overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform ${selectedLine === l.key ? 'ring-2 ring-accent' : ''}`}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-[10px] bg-bg-base flex-shrink-0 overflow-hidden">
                      {l.image ? (
                        <img src={l.image} alt={l.title} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-xl">{l.title[0]}</div>
                      )}
                    </div>
                    <p className="text-[16px] font-medium text-text-primary flex-1">{l.title}</p>
                    {selectedLine === l.key && (
                      <svg className="w-5 h-5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'products' && (
          <>
            <h1 className="text-[24px] font-bold text-text-primary mb-4">
              {lineTitle || brandTitle || categoryTitle}
            </h1>

            {loading && <Spinner />}

            {!loading && products.length === 0 && (
              <p className="text-text-secondary text-center mt-10">Товары не найдены</p>
            )}

            {!loading && (
              <div className="grid grid-cols-2 gap-3">
                {products.map(p => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            )}
          </>
        )}

        {loading && step !== 'products' && <Spinner />}

        {/* кнопки фильтра (всегда видны при наличии данных) */}
        {step === 'products' && !loading && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {brands.length > 0 && (
              <button
                onClick={() => setBrandsSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border-light text-[13px] text-text-secondary"
              >
                <span>{brandTitle || 'Бренд'}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {lines.length > 0 && (
              <button
                onClick={() => setLinesSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border-light text-[13px] text-text-secondary"
              >
                <span>{lineTitle || 'Линейка'}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* шит выбора бренда */}
      <BottomSheet open={brandsSheet} onClose={() => setBrandsSheet(false)} title="Выберите бренд">
        <SelectionList
          items={brands.map(b => ({ key: b.key, title: b.title, image: b.image }))}
          selected={selectedBrand}
          onSelect={(key) => { setSelectedBrand(key); setBrandsSheet(false); if (selectedLine) loadProducts(key, selectedLine) }}
        />
        <div className="p-4 border-t border-border-light">
          <Button fullWidth onClick={() => setBrandsSheet(false)} disabled={!selectedBrand}>
            Продолжить
          </Button>
        </div>
      </BottomSheet>

      {/* шит выбора линейки */}
      <BottomSheet open={linesSheet} onClose={() => setLinesSheet(false)} title="Выберите линейку">
        <SelectionList
          items={lines.map(l => ({ key: l.key, title: l.title, image: l.image }))}
          selected={selectedLine}
          onSelect={(key) => { setSelectedLine(key); setLinesSheet(false); loadProducts(selectedBrand!, key) }}
          layout="grid"
        />
        <div className="p-4 border-t border-border-light">
          <Button fullWidth onClick={() => setLinesSheet(false)} disabled={!selectedLine}>
            Продолжить
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
