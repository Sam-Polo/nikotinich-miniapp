import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCategories, getBrands, getLines, getProducts } from '../api'
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
  const navigate = useNavigate()

  const [brands, setBrands] = useState<Brand[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('brand')
  const [brandConfirmed, setBrandConfirmed] = useState(false)

  const [loading, setLoading] = useState(true)
  const [brandsSheet, setBrandsSheet] = useState(false)
  const [linesSheet, setLinesSheet] = useState(false)
  const [resolvedCategoryTitle, setResolvedCategoryTitle] = useState<string>(categoryKey.replace(/_/g, ' '))

  // название категории по ключу (с API)
  useEffect(() => {
    if (!categoryKey) return
    getCategories()
      .then(cats => {
        const cat = cats.find(c => c.key === categoryKey)
        if (cat?.title) setResolvedCategoryTitle(cat.title)
      })
      .catch(() => {})
  }, [categoryKey])

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

  // загрузка линеек после подтверждения бренда
  useEffect(() => {
    if (!selectedBrand || !brandConfirmed) return
    getLines(selectedBrand)
      .then(l => {
        setLines(l)
        if (l.length === 0) {
          // если линеек нет, сразу переходим к товарам
          loadProducts(selectedBrand, undefined)
        }
      })
      .catch(() => {})
  }, [selectedBrand, brandConfirmed])

  function loadProducts(brand?: string, line?: string) {
    setLoading(true)
    getProducts({ category: categoryKey, brand, line })
      .then(setProducts)
      .catch(() => {})
      .finally(() => { setLoading(false); setStep('products') })
  }

  function handleBrandSelect(key: string) {
    setSelectedBrand(key)
    setSelectedLine(null)
    setLines([])
    setBrandConfirmed(false)
  }

  function handleLineSelect(key: string) {
    setSelectedLine(key)
  }

  function handleBrandProceed() {
    if (!selectedBrand) return
    setBrandConfirmed(true)
    if (lines.length > 0) {
      setStep('line')
    } else {
      // если линеек ещё нет в стейте, ждём загрузку в эффекте
      setStep('line')
    }
  }

  function handleLineProceed() {
    if (!selectedBrand || !selectedLine) return
    loadProducts(selectedBrand, selectedLine)
  }

  const brandTitle = brands.find(b => b.key === selectedBrand)?.title
  const lineTitle = lines.find(l => l.key === selectedLine)?.title

  const showHeader = step === 'products' && !loading && !brandsSheet && !linesSheet

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      {showHeader && <PageHeader title="Никотиныч" subtitle="mini app" showBack />}

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-4 pb-36">
        {/* хлебные крошки — только на экране товаров */}
        {step === 'products' && (brandTitle || lineTitle) && (
          <div className="flex items-center gap-1 mb-3">
            {brandTitle && (
              <button
                onClick={() => { setSelectedBrand(null); setSelectedLine(null); setStep('brand'); setBrandsSheet(true); setBrandConfirmed(false) }}
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
        )}

        {/* бренды — одна колонка, стиль как у категорий (карточка с картинкой и названием) */}
        {step === 'brand' && !loading && brands.length > 0 && (
          <>
            <p className="text-accent text-[13px] font-medium">{resolvedCategoryTitle}</p>
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите бренд</h1>
            <div className="grid grid-cols-1 gap-0">
              {brands.map(b => (
                <button
                  key={b.key}
                  onClick={() => handleBrandSelect(b.key)}
                  className="bg-card-bg rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div
                      className={`w-16 h-16 rounded-[10px] bg-[#F8F8F8] flex-shrink-0 overflow-hidden ${
                        selectedBrand === b.key ? 'ring-2 ring-accent' : ''
                      }`}
                    >
                      {b.image ? (
                        <img src={b.image} alt={b.title} className="w-full h-full object-contain p-1 mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-[11px]">Нет фото</div>
                      )}
                    </div>
                    <p className="text-[16px] font-medium text-text-primary flex-1">{b.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* линейки — одна колонка, тот же стиль карточек */}
        {step === 'line' && !loading && lines.length > 0 && (
          <>
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите линейку</h1>
            <div className="grid grid-cols-1 gap-0">
              {lines.map(l => (
              <button
                  key={l.key}
                  onClick={() => handleLineSelect(l.key)}
                  className="bg-card-bg rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div
                      className={`w-16 h-16 rounded-[10px] bg-[#F8F8F8] flex-shrink-0 overflow-hidden ${
                        selectedLine === l.key ? 'ring-2 ring-accent' : ''
                      }`}
                    >
                      {l.image ? (
                        <img src={l.image} alt={l.title} className="w-full h-full object-contain p-1 mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-[11px]">Нет фото</div>
                      )}
                    </div>
                    <p className="text-[16px] font-medium text-text-primary flex-1">{l.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'products' && (
          <>
            <h1 className="text-[24px] font-bold text-text-primary mb-4">
              {lineTitle || brandTitle || resolvedCategoryTitle}
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
          onSelect={(key) => { setSelectedBrand(key); setSelectedLine(null); setLines([]); setBrandConfirmed(false) }}
        />
        <div className="p-4 border-t border-border-light flex flex-col items-center">
          <Button
            fullWidth
            onClick={() => { handleBrandProceed(); setBrandsSheet(false) }}
            disabled={!selectedBrand}
          >
            Продолжить
          </Button>
          <button
            type="button"
            onClick={() => { navigate('/'); setBrandsSheet(false) }}
            className="mt-2 text-[14px] font-semibold text-accent"
          >
            Вернуться в каталог
          </button>
        </div>
      </BottomSheet>

      {/* шит выбора линейки */}
      <BottomSheet open={linesSheet} onClose={() => setLinesSheet(false)} title="Выберите линейку">
        <SelectionList
          items={lines.map(l => ({ key: l.key, title: l.title, image: l.image }))}
          selected={selectedLine}
          onSelect={(key) => { setSelectedLine(key) }}
          layout="grid"
        />
        <div className="p-4 border-t border-border-light flex flex-col items-center">
          <Button
            fullWidth
            onClick={() => { handleLineProceed(); setLinesSheet(false) }}
            disabled={!selectedLine}
          >
            Продолжить
          </Button>
          <button
            type="button"
            onClick={() => { navigate('/'); setLinesSheet(false) }}
            className="mt-2 text-[14px] font-semibold text-accent"
          >
            Вернуться в каталог
          </button>
        </div>
      </BottomSheet>

      {/* фиксированные кнопки выбора снизу */}
        {step === 'brand' && !loading && brands.length > 0 && (
        <div
          className="fixed left-0 right-0 bg-white px-4 py-3 z-[60]"
            style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          {!selectedBrand ? (
          <div className="flex flex-col items-center">
            <button
                type="button"
                className="w-full rounded-[999px] bg-[#F1F2F5] py-[14px] text-[15px] font-semibold text-[#B0B5C0]"
              >
                Выберите бренд
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 text-[15px] font-semibold text-accent"
              >
                Вернуться в каталог
              </button>
            </div>
          ) : (
          <div className="flex flex-col items-center">
              <Button fullWidth className="text-[15px]" onClick={handleBrandProceed}>
                Продолжить
              </Button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 text-[15px] font-semibold text-accent"
              >
                Вернуться в каталог
              </button>
            </div>
          )}
        </div>
      )}

        {step === 'line' && !loading && lines.length > 0 && (
        <div
          className="fixed left-0 right-0 bg-white px-4 py-3 z-[60]"
            style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          {!selectedLine ? (
          <div className="flex flex-col items-center">
            <button
                type="button"
                className="w-full rounded-[999px] bg-[#F1F2F5] py-[14px] text-[15px] font-semibold text-[#B0B5C0]"
              >
                Выберите линейку
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 text-[15px] font-semibold text-accent"
              >
                Вернуться в каталог
              </button>
            </div>
          ) : (
          <div className="flex flex-col items-center">
              <Button fullWidth className="text-[15px]" onClick={handleLineProceed}>
                Продолжить
              </Button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 text-[15px] font-semibold text-accent"
              >
                Вернуться в каталог
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
