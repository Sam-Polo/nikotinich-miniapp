import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getCategories, getBrands, getLines, getModels, getProducts } from '../api'
import type { Brand, Line, Product, Model } from '../api'
import { useUiStore } from '../store/ui'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import BottomSheet from '../components/BottomSheet'
import SelectionList from '../components/SelectionList'
import Button from '../components/Button'
import { ProductGridSkeleton, BrandListSkeleton, LineListSkeleton } from '../components/Skeleton'
import ProductPage from './ProductPage'

// шаги выбора фильтра
type Step = 'brand' | 'line' | 'model' | 'products'

type CatalogState = {
  step?: Step
  selectedBrand?: string | null
  selectedLine?: string | null
  selectedModel?: string | null
}

export default function CategoryPage() {
  const { categoryKey = '' } = useParams<{ categoryKey: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const catalogState = location.state as CatalogState | undefined

  const [brands, setBrands] = useState<Brand[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [models, setModels] = useState<Model[]>([])

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('brand')
  const [brandConfirmed, setBrandConfirmed] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [brandsSheet, setBrandsSheet] = useState(false)
  const [linesSheet, setLinesSheet] = useState(false)
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null)
  const [resolvedCategoryTitle, setResolvedCategoryTitle] = useState<string>('')
  const restoredCatalogRef = useRef(false)
  const setHideBottomNav = useUiStore(s => s.setHideBottomNav)

  // восстановление шага/фильтров при возврате из карточки товара (один раз за вход на страницу)
  useEffect(() => {
    if (!categoryKey) return
    restoredCatalogRef.current = false
  }, [categoryKey])

  useEffect(() => {
    if (!catalogState?.step || !categoryKey || restoredCatalogRef.current) return
    restoredCatalogRef.current = true
    setStep(catalogState.step)
    if (catalogState.selectedBrand != null) setSelectedBrand(catalogState.selectedBrand)
    if (catalogState.selectedLine != null) setSelectedLine(catalogState.selectedLine)
    if (catalogState.step === 'products') {
      loadProducts(
        catalogState.selectedBrand ?? undefined,
        catalogState.selectedLine ?? undefined,
        catalogState.selectedModel ?? undefined
      )
    }
  }, [categoryKey, catalogState?.step, catalogState?.selectedBrand, catalogState?.selectedLine, catalogState?.selectedModel])

  // название категории по ключу (с API)
  useEffect(() => {
    if (!categoryKey) return
    getCategories()
      .then(cats => {
        const cat = cats.find(c => c.key === categoryKey)
        setResolvedCategoryTitle(cat?.title ?? categoryKey.replace(/_/g, ' '))
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
        // при возврате из карточки товара loading управляет loadProducts, не сбрасываем
        if (!restoredCatalogRef.current) setLoading(false)
      })
      .catch(() => { if (!restoredCatalogRef.current) setLoading(false) })
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

  function loadProducts(brand?: string, line?: string, modelKey?: string) {
    setLoading(true)
    getProducts({ category: categoryKey, brand, line })
      .then((list) => {
        if (modelKey) {
          setProducts(list.filter(p => p.modelKey === modelKey))
        } else {
          setProducts(list)
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setStep('products')
      })
  }

  function handleBrandSelect(key: string) {
    setSelectedBrand(key)
    setSelectedLine(null)
    setLines([])
    setBrandConfirmed(false)
  }

  function handleLineSelect(key: string) {
    setSelectedLine(key)
    setSelectedModel(null)
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

    setLoading(true)
    getModels(categoryKey, selectedBrand, selectedLine)
      .then((ms) => {
        setModels(ms)
        if (ms.length > 0) {
          setStep('model')
          setLoading(false)
        } else {
          loadProducts(selectedBrand, selectedLine)
        }
      })
      .catch(() => {
        // если не смогли получить модели — просто покажем товары линейки
        loadProducts(selectedBrand, selectedLine)
      })
  }

  const brandTitle = brands.find(b => b.key === selectedBrand)?.title
  const lineTitle = lines.find(l => l.key === selectedLine)?.title
  const modelTitle = models.find(m => m.key === selectedModel)?.title

  const showHeader = !brandsSheet && !linesSheet

  // «Назад» — на шаг назад по цепочке: товары → модель → линейка/бренд → бренд → главная
  function handleBack() {
    if (step === 'products') {
      if (models.length > 0 && selectedModel) {
        setStep('model')
        setProducts([])
        return
      }
      setStep(lines.length > 0 ? 'line' : 'brand')
      setProducts([])
    } else if (step === 'model') {
      setStep('line')
      setSelectedModel(null)
    } else if (step === 'line') {
      setStep('brand')
      setSelectedLine(null)
      setLines([])
      setBrandConfirmed(false)
    } else {
      navigate('/')
    }
  }

  // управляем видимостью нижнего навигационного тулбара:
  // на шагах выбора бренда/линейки/модели скрываем, на товарах — показываем
  useEffect(() => {
    if (step === 'products') {
      setHideBottomNav(false)
    } else {
      setHideBottomNav(true)
    }
    return () => {
      setHideBottomNav(false)
    }
  }, [step, setHideBottomNav])

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      {showHeader && (
        <PageHeader title="Никотиныч" subtitle="mini app" showBack onBack={handleBack} />
      )}

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-4 pb-36">
        {/* на шагах выбора/товаров отдельные цепочки не показываем — только заголовки ниже */}

        {/* бренды — скелетон при загрузке, иначе список */}
        {step === 'brand' && loading && (
          <div key="brand-skeleton" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите бренд</h1>
            <BrandListSkeleton />
          </div>
        )}
        {step === 'brand' && !loading && brands.length > 0 && (
          <div key="brand" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите бренд</h1>
            <div className="grid grid-cols-1 gap-0">
              {brands.map((b, i) => (
                <button
                  key={b.key}
                  onClick={() => handleBrandSelect(b.key)}
                  className="animate-stagger-in bg-card-bg rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
                  style={{ ['--stagger-i' as string]: `${i * 40}ms` }}
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
          </div>
        )}

        {/* шаг линейки — без дополнительной цепочки сверху, только заголовок */}

        {/* линейки — скелетон только пока ждём загрузку линеек (не при загрузке товаров) */}
        {step === 'line' && !loading && lines.length === 0 && selectedBrand && (
          <div key="line-skeleton" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите линейку</h1>
            <LineListSkeleton />
          </div>
        )}
        {/* при выборе линейки и нажатии «Продолжить» грузим товары — показываем скелетон сетки товаров */}
        {step === 'line' && loading && (
          <div key="line-loading-products" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">{lineTitle || brandTitle || resolvedCategoryTitle}</h1>
            <ProductGridSkeleton />
          </div>
        )}
        {step === 'line' && !loading && lines.length > 0 && (
          <div key="line" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите линейку</h1>
            <div className="grid grid-cols-1 gap-0">
              {lines.map((l, i) => (
              <button
                  key={l.key}
                  onClick={() => handleLineSelect(l.key)}
                  className="animate-stagger-in bg-card-bg rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
                  style={{ ['--stagger-i' as string]: `${i * 40}ms` }}
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
          </div>
        )}

        {/* модели */}
        {step === 'model' && loading && (
          <div key="model-loading" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите модель</h1>
            <LineListSkeleton />
          </div>
        )}
        {step === 'model' && !loading && models.length === 0 && (
          <div key="model-empty" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Модели не найдены</h1>
          </div>
        )}
        {step === 'model' && !loading && models.length > 0 && (
          <div key="model" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">Выберите модель</h1>
            <div className="grid grid-cols-1 gap-0">
              {models.map((m, i) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedModel(m.key)}
                  className="animate-stagger-in bg-card-bg rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
                  style={{ ['--stagger-i' as string]: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div
                      className={`w-16 h-16 rounded-[10px] bg-[#F8F8F8] flex-shrink-0 overflow-hidden ${
                        selectedModel === m.key ? 'ring-2 ring-accent' : ''
                      }`}
                    >
                      {m.image ? (
                        <img src={m.image} alt={m.title} className="w-full h-full object-contain p-1 mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-[11px]">
                          Нет фото
                        </div>
                      )}
                    </div>
                    <p className="text-[16px] font-medium text-text-primary flex-1">{m.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'products' && (
          <div key="products" className="animate-step-in">
            <h1 className="text-[24px] font-bold text-text-primary mb-4">
              {modelTitle || lineTitle || brandTitle || resolvedCategoryTitle}
            </h1>

            {loading && <ProductGridSkeleton />}

            {!loading && products.length === 0 && (
              <p className="text-text-secondary text-center mt-10">Товары не найдены</p>
            )}

            {!loading && products.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {products.map((p, i) => (
                  <div
                    key={p.slug}
                    className="animate-stagger-in"
                    style={{ ['--stagger-i' as string]: `${i * 45}ms` }}
                  >
                    <ProductCard
                      product={p}
                      onProductClick={(slug) => setSelectedProductSlug(slug)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


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

      {step === 'model' && !loading && models.length > 0 && (
        <div
          className="fixed left-0 right-0 bg-white px-4 py-3 z-[60]"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          {!selectedModel ? (
            <div className="flex flex-col items-center">
              <button
                type="button"
                className="w-full rounded-[999px] bg-[#F1F2F5] py-[14px] text-[15px] font-semibold text-[#B0B5C0]"
              >
                Выберите модель
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
              <Button
                fullWidth
                className="text-[15px]"
                onClick={() => {
                  if (!selectedBrand || !selectedLine || !selectedModel) return
                  loadProducts(selectedBrand, selectedLine, selectedModel)
                }}
              >
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

      {/* карточка товара — боттом-шит поверх списка без смены роута */}
      {selectedProductSlug && (
        <ProductPage
          embedded
          slugProp={selectedProductSlug}
          onClose={() => setSelectedProductSlug(null)}
          onVariantChange={(s) => setSelectedProductSlug(s)}
        />
      )}
    </div>
  )
}
