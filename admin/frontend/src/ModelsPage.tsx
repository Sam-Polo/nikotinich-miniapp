import { useState, useEffect, useRef } from 'react'
import { api, removeToken } from './api'
import AdminNav from './components/AdminNav'
import './App.css'

type Model = {
  category_key: string
  brand_key: string
  line_key: string
  key: string
  title: string
  image: string
  order: number
}

type CategoryOption = { key: string; title: string }
type BrandOption = { category_key: string; key: string; title: string }
type LineOption = { brand_key: string; key: string; title: string }

type Product = {
  slug: string
  title: string
  article?: string
  category: string
  brand?: string
  line?: string
  images?: string[]
  modelKey?: string
}

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'models' | 'content' | 'orders' | 'users' | 'referral'

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

function ModelsPage({ onNavigate }: { onNavigate?: (page: AdminPage, params?: { category_key?: string; brand_key?: string; line_key?: string }) => void }) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [lines, setLines] = useState<LineOption[]>([])
  const [models, setModels] = useState<Model[]>([])

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('')
  const [selectedBrandKey, setSelectedBrandKey] = useState<string>('')
  const [selectedLineKey, setSelectedLineKey] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Model | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [formData, setFormData] = useState<{ category_key: string; brand_key: string; line_key: string; key: string; title: string; image: string }>({
    category_key: '',
    brand_key: '',
    line_key: '',
    key: '',
    title: '',
    image: ''
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductSlugs, setSelectedProductSlugs] = useState<Set<string>>(new Set())
  const [modalProductsLoading, setModalProductsLoading] = useState(false)

  const brandsInCategory = selectedCategoryKey
    ? brands.filter((b) => b.category_key.toLowerCase() === selectedCategoryKey.toLowerCase())
    : []
  const linesInBrand = selectedBrandKey
    ? lines.filter((l) => l.brand_key.toLowerCase() === selectedBrandKey.toLowerCase())
    : []
  const displayedModels = selectedLineKey
    ? models.filter((m) =>
        m.category_key.toLowerCase() === selectedCategoryKey.toLowerCase() &&
        m.brand_key.toLowerCase() === selectedBrandKey.toLowerCase() &&
        m.line_key.toLowerCase() === selectedLineKey.toLowerCase()
      )
    : []

  useEffect(() => {
    loadInitial()
  }, [])

  const loadInitial = async () => {
    try {
      setLoading(true)
      const [catsRes, linesRes, modelsRes] = await Promise.all([
        api.getCategories(),
        api.getLines(),
        api.getModels()
      ])
      const catList = (catsRes.categories || []).map((c: any) => ({ key: c.key, title: c.title || c.key }))
      setCategories(catList)
      const allLines = (linesRes.lines || []) as LineOption[]
      setLines(allLines)
      const allModels = (modelsRes.models || []) as Model[]
      setModels(allModels)
      if (catList.length && !selectedCategoryKey) {
        setSelectedCategoryKey(catList[0].key)
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка загрузки данных', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCategoryKey) {
      api.getBrands(selectedCategoryKey)
        .then((data: { brands?: BrandOption[] }) => setBrands(data.brands || []))
        .catch(() => setBrands([]))
    } else {
      setBrands([])
    }
    setSelectedBrandKey('')
    setSelectedLineKey('')
  }, [selectedCategoryKey])

  useEffect(() => {
    setSelectedLineKey('')
  }, [selectedBrandKey])

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  const saveModels = async (list: Model[]) => {
    // пересчёт order по общему списку
    const withOrder = list.map((m, i) => ({ ...m, order: i }))
    try {
      await api.saveModels(withOrder.map(({ category_key, brand_key, line_key, key, title, image }) => ({
        category_key,
        brand_key,
        line_key,
        key,
        title: title || key,
        image: image || ''
      })))
      setModels(withOrder)
      showToast('Модели сохранены', 'success')
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения моделей', 'error')
    }
  }

  const handleAdd = () => {
    if (!selectedCategoryKey || !selectedBrandKey || !selectedLineKey) {
      showToast('Сначала выберите категорию, бренд и линейку', 'error')
      return
    }
    setEditingModel(null)
    setFormData({
      category_key: selectedCategoryKey,
      brand_key: selectedBrandKey,
      line_key: selectedLineKey,
      key: '',
      title: '',
      image: ''
    })
    setSelectedProductSlugs(new Set())
    setProducts([])
    setProductSearch('')
    setIsModalOpen(true)
  }

  const handleEdit = async (m: Model) => {
    setEditingModel(m)
    setFormData({
      category_key: m.category_key,
      brand_key: m.brand_key,
      line_key: m.line_key,
      key: m.key,
      title: m.title,
      image: m.image || ''
    })
    setSelectedProductSlugs(new Set())
    setProducts([])
    setProductSearch('')
    setIsModalOpen(true)
    setModalProductsLoading(true)
    await loadProductsForModel(m)
    setModalProductsLoading(false)
  }

  const handleDeleteClick = (m: Model) => setDeleteConfirm(m)

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const next = models.filter(
      (m) =>
        m.key !== deleteConfirm.key ||
        m.category_key !== deleteConfirm.category_key ||
        m.brand_key !== deleteConfirm.brand_key ||
        m.line_key !== deleteConfirm.line_key
    )
    setDeleteConfirm(null)
    await saveModels(next)
  }

  const normalizeKey = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, '_')

  const isValidKey = (value: string) =>
    /^[a-z0-9_-]+$/.test(value)

  const handleSaveModelMeta = async () => {
    const { category_key, brand_key, line_key, key, title, image } = formData
    if (!key.trim()) {
      showToast('Укажите ключ модели', 'error')
      return
    }
    const normalizedKey = normalizeKey(key)
    if (!isValidKey(normalizedKey)) {
      showToast('Только латиница, цифры, дефис и подчёркивание; без пробелов', 'error')
      return
    }
    if (!title.trim()) {
      showToast('Укажите название модели', 'error')
      return
    }

    const scope = models.filter(
      (m) =>
        m.category_key === category_key &&
        m.brand_key === brand_key &&
        m.line_key === line_key
    )
    const existing = scope.find(
      (m) =>
        m.key.toLowerCase() === normalizedKey &&
        (!editingModel ||
          m.key !== editingModel.key ||
          m.category_key !== editingModel.category_key ||
          m.brand_key !== editingModel.brand_key ||
          m.line_key !== editingModel.line_key)
    )
    if (existing) {
      showToast('Модель с таким ключом уже есть в этой линейке', 'error')
      return
    }

    let next: Model[]
    if (editingModel) {
      next = models.map((m) =>
        m.category_key === editingModel.category_key &&
        m.brand_key === editingModel.brand_key &&
        m.line_key === editingModel.line_key &&
        m.key === editingModel.key
          ? { ...m, category_key, brand_key, line_key, key: normalizedKey, title: title.trim(), image }
          : m
      )
    } else {
      next = [
        ...models,
        {
          category_key,
          brand_key,
          line_key,
          key: normalizedKey,
          title: title.trim(),
          image,
          order: models.length
        }
      ]
    }

    try {
      await saveModels(next)
      // после сохранения меты — сохраним привязку товаров (если уже загружены)
      await saveProductsForModel(normalizedKey, category_key, brand_key, line_key)
    } finally {
      setIsModalOpen(false)
    }
  }

  const loadProductsForModel = async (m: Model) => {
    try {
      const res = await api.getProducts()
      const list: Product[] = (res.products || []).filter(
        (p: any) =>
          p.category === m.category_key &&
          (p.brand || '').toLowerCase() === m.brand_key.toLowerCase() &&
          (p.line || '').toLowerCase() === m.line_key.toLowerCase()
      )
      setProducts(list)
      const selected = new Set<string>(
        list.filter((p) => (p as any).modelKey === m.key).map((p) => p.slug)
      )
      setSelectedProductSlugs(selected)
    } catch (e: any) {
      showToast(e?.message || 'Ошибка загрузки товаров для модели', 'error')
      setProducts([])
      setSelectedProductSlugs(new Set())
    }
  }

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return true
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.article || '').toLowerCase().includes(q)
    )
  })

  const toggleProductSelection = (slug: string) => {
    setSelectedProductSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const saveProductsForModel = async (
    modelKey: string,
    category_key?: string,
    brand_key?: string,
    line_key?: string
  ) => {
    if (!products.length) return
    try {
      const all = await api.getProducts()
      const allProducts: Product[] = all.products || []

      const key = modelKey
      const scope = allProducts.filter(
        (p: any) =>
          (!category_key || p.category === category_key) &&
          (!brand_key || (p.brand || '').toLowerCase() === brand_key.toLowerCase()) &&
          (!line_key || (p.line || '').toLowerCase() === line_key.toLowerCase())
      )

      const selected = new Set(selectedProductSlugs)

      for (const p of scope) {
        const shouldHave = selected.has(p.slug)
        const has = (p as any).modelKey === key
        if (shouldHave && !has) {
          await api.updateProduct(p.slug, { ...p, modelKey: key })
        } else if (!shouldHave && has) {
          const { modelKey: _omit, ...rest } = p as any
          await api.updateProduct(p.slug, { ...rest, modelKey: undefined })
        }
      }
      showToast('Товары модели обновлены', 'success')
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения товаров модели', 'error')
    }
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <AdminNav currentPage="models" onNavigate={(p) => onNavigate?.(p as AdminPage)} />
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="categories-content">
        <p className="categories-hint">
          Модели — дополнительный уровень после линейки. Выберите категорию, бренд и линейку, затем создайте модели и привяжите к ним товары.
        </p>
        <div className="toolbar toolbar--transparent">
          <div className="toolbar-row-filters">
            <div className="toolbar-filters">
              <label>Категория</label>
              <select
                className="admin-select"
                value={selectedCategoryKey}
                onChange={(e) => setSelectedCategoryKey(e.target.value)}
              >
                <option value="">— Выберите категорию —</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.title}</option>
                ))}
              </select>
              <label>Бренд</label>
              <select
                className="admin-select"
                value={selectedBrandKey}
                onChange={(e) => setSelectedBrandKey(e.target.value)}
                disabled={!selectedCategoryKey}
              >
                <option value="">— Выберите бренд —</option>
                {brandsInCategory.map((b) => (
                  <option key={b.key} value={b.key}>{b.title}</option>
                ))}
              </select>
              <label>Линейка</label>
              <select
                className="admin-select"
                value={selectedLineKey}
                onChange={(e) => setSelectedLineKey(e.target.value)}
                disabled={!selectedBrandKey}
              >
                <option value="">— Выберите линейку —</option>
                {linesInBrand.map((l) => (
                  <option key={l.key} value={l.key}>{l.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="toolbar-row-actions">
            <button type="button" className="btn btn-add" onClick={handleAdd}>Добавить модель</button>
          </div>
        </div>

        {!selectedCategoryKey || !selectedBrandKey || !selectedLineKey ? (
          <div className="empty-state"><p>Выберите категорию, бренд и линейку</p></div>
        ) : displayedModels.length === 0 ? (
          <div className="empty-state">
            <p>Нет моделей в этой линейке.</p>
            <button type="button" className="btn btn-add" onClick={handleAdd}>Добавить модель</button>
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Фото</th>
                  <th>Название</th>
                  <th>Ключ</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {displayedModels.map((m) => (
                  <tr key={`${m.category_key}-${m.brand_key}-${m.line_key}-${m.key}`}>
                    <td data-label="Фото">
                      <div
                        className="category-row-preview category-row-preview-square"
                        style={{
                          backgroundImage: m.image ? `url(${m.image})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                    </td>
                    <td data-label="Название">{m.title}</td>
                    <td data-label="Ключ">{m.key}</td>
                    <td data-label="Действия">
                      <button type="button" className="btn-icon btn-edit" onClick={() => handleEdit(m)} title="Редактировать"><EditIcon /></button>
                      <button type="button" className="btn-icon btn-delete" onClick={() => handleDeleteClick(m)} title="Удалить"><TrashIcon /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null)
          }}
        >
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Удалить модель?</h3>
            <p>Модель «{deleteConfirm.title}» будет удалена. Привязка товаров по model_key нужно будет настраивать заново.</p>
            <div className="confirm-actions">
              <button className="btn btn-cancel" onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button className="btn btn-confirm" onClick={handleDeleteConfirm}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
        >
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>{editingModel ? 'Редактировать модель' : 'Добавить модель'}</h2>

            <div className="form-group">
              <label>Категория</label>
              <select
                value={formData.category_key}
                onChange={(e) => setFormData((p) => ({ ...p, category_key: e.target.value }))}
                disabled={!!editingModel}
                style={{ padding: '0.5rem' }}
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Бренд</label>
              <select
                value={formData.brand_key}
                onChange={(e) => setFormData((p) => ({ ...p, brand_key: e.target.value }))}
                disabled={!!editingModel}
                style={{ padding: '0.5rem' }}
              >
                {brandsInCategory.map((b) => (
                  <option key={b.key} value={b.key}>{b.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Линейка</label>
              <select
                value={formData.line_key}
                onChange={(e) => setFormData((p) => ({ ...p, line_key: e.target.value }))}
                disabled={!!editingModel}
                style={{ padding: '0.5rem' }}
              >
                {linesInBrand.map((l) => (
                  <option key={l.key} value={l.key}>{l.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Название модели *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Например: XROS 3"
              />
            </div>

            <div className="form-group">
              <label>Ключ модели *</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData((p) => ({ ...p, key: normalizeKey(e.target.value) }))}
                placeholder="например: xros_3"
                disabled={!!editingModel}
              />
              {formData.key.length > 0 && !isValidKey(formData.key) && (
                <small className="text-warning" style={{ color: '#856404' }}>
                  Только латиница, цифры, дефис и подчёркивание; без пробелов
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Фото модели (1:1)</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="model-image-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
                    if (!allowed.includes(file.type.toLowerCase())) {
                      showToast('Поддерживаются JPG, PNG, WebP', 'error')
                      return
                    }
                    setUploading(true)
                    try {
                      const uploaded = await api.uploadImage(file, { square: true })
                      setFormData((prev) => ({ ...prev, image: uploaded.url }))
                    } catch (err: any) {
                      showToast(err?.message || 'Ошибка загрузки фото', 'error')
                    } finally {
                      setUploading(false)
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <label htmlFor="model-image-input" className="image-upload-button">
                  {uploading ? 'Загрузка...' : 'Загрузить фото'}
                </label>
                {formData.image && (
                  <div
                    className="category-form-preview"
                    style={{ backgroundImage: `url(${formData.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                )}
              </div>
            </div>

            <hr style={{ margin: '1rem 0' }} />

            <div className="form-group">
              <label>Товары модели</label>
              {!editingModel && (
                <p className="categories-hint">
                  После сохранения модели она появится в списке. Откройте её на редактирование, чтобы выбрать товары.
                </p>
              )}
              {editingModel && (
                <>
                  <div className="toolbar-filters" style={{ marginBottom: '0.5rem' }}>
                    <label className="search-label">
                      Поиск по товарам линейки
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Название, артикул, slug..."
                        className="search-input"
                      />
                    </label>
                  </div>
                  {modalProductsLoading ? (
                    <div className="loading">Загрузка товаров...</div>
                  ) : products.length === 0 ? (
                    <div className="empty-state">
                      <p>Товары для этой линейки не найдены.</p>
                    </div>
                  ) : (
                    <div className="products-list products-list--compact">
                      {filteredProducts.map((p) => {
                        const checked = selectedProductSlugs.has(p.slug)
                        return (
                          <label key={p.slug} className="product-checkbox-row">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProductSelection(p.slug)}
                            />
                            <span className="product-checkbox-main">
                              {p.images && p.images.length > 0 && (
                                <span className="product-checkbox-thumb">
                                  <img
                                    src={p.images[0]}
                                    alt={p.title}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      objectFit: 'cover',
                                      borderRadius: 6
                                    }}
                                  />
                                </span>
                              )}
                              <span className="product-checkbox-title">{p.title}</span>
                              <span className="product-checkbox-meta">
                                <span>slug: {p.slug}</span>
                                {p.article && <span>арт: {p.article}</span>}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button type="button" className="btn btn-confirm" onClick={handleSaveModelMeta}>Сохранить модель</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelsPage

