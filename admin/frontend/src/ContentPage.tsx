import { useEffect, useState, useRef, useCallback } from 'react'
import { api, removeToken } from './api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './App.css'

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'content' | 'orders' | 'users' | 'referral'
type ContentItemType = 'news' | 'collection'
type ContentItem = {
  id: string
  type: ContentItemType
  title: string
  body?: string
  imageUrl?: string
  publishedAt?: string
  active: boolean
  sort: number
  productSlugs: string[]
}

type Product = { slug: string; title?: string; article?: string }

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

function SortableContentRow({
  item,
  onEdit,
  onDelete
}: {
  item: ContentItem
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      <td data-label="Сортировка">
        <span className="drag-handle" {...attributes} {...listeners}>⋮⋮</span>
      </td>
      <td data-label="Тип" className="content-type-cell">{item.type === 'news' ? 'Новость' : 'Подборка'}</td>
      <td data-label="Фото">
        <div
          className="content-row-preview"
          style={{
            backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      </td>
      <td data-label="Заголовок" className="content-title-cell">{item.title || '—'}</td>
      <td data-label="Дата" className="content-date-cell">{item.publishedAt || '—'}</td>
      <td data-label="Активна">{item.active ? 'Да' : 'Нет'}</td>
      <td data-label="Действия">
        <button type="button" className="btn-icon btn-edit" onClick={onEdit} title="Редактировать"><EditIcon /></button>
        <button type="button" className="btn-icon btn-delete" onClick={onDelete} title="Удалить"><TrashIcon /></button>
      </td>
    </tr>
  )
}

export default function ContentPage({ onNavigate }: { onNavigate?: (page: AdminPage) => void }) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    body: string
    imageUrl: string
    publishedAt: string
    active: boolean
    productSlugs: string[]
  }>({
    title: '',
    body: '',
    imageUrl: '',
    publishedAt: '',
    active: true,
    productSlugs: []
  })
  const [uploading, setUploading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getContent()
      setItems((data.items || []).map((it: ContentItem, i: number) => ({ ...it, sort: it.sort ?? i })))
      setError('')
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  const openModal = (item: ContentItem | null, type: ContentItemType) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title,
        body: item.body || '',
        imageUrl: item.imageUrl || '',
        publishedAt: item.publishedAt || '',
        active: item.active,
        productSlugs: item.productSlugs || []
      })
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        body: '',
        imageUrl: '',
        publishedAt: '',
        active: true,
        productSlugs: type === 'collection' ? [] : []
      })
    }
    setProductSearch('')
    setProductSearchResults([])
    setIsModalOpen(true)
  }

  const handleAddNews = () => {
    const newItem: ContentItem = {
      id: `news-${Date.now()}`,
      type: 'news',
      title: '',
      body: '',
      imageUrl: '',
      publishedAt: '',
      active: true,
      sort: items.length,
      productSlugs: []
    }
    setItems((prev) => [...prev, newItem])
    openModal(newItem, 'news')
  }

  const handleAddCollection = () => {
    const newItem: ContentItem = {
      id: `col-${Date.now()}`,
      type: 'collection',
      title: '',
      body: '',
      imageUrl: '',
      publishedAt: '',
      active: true,
      sort: items.length,
      productSlugs: []
    }
    setItems((prev) => [...prev, newItem])
    openModal(newItem, 'collection')
  }

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      body: item.body || '',
      imageUrl: item.imageUrl || '',
      publishedAt: item.publishedAt || '',
      active: item.active,
      productSlugs: item.productSlugs || []
    })
    setProductSearch('')
    setProductSearchResults([])
    setIsModalOpen(true)
  }

  const handleDelete = async (item: ContentItem) => {
    const next = items.filter((x) => x.id !== item.id).map((it, i) => ({ ...it, sort: i }))
    setItems(next)
    setSaving(true)
    try {
      await api.saveContent(next)
      showToast('Удалено', 'success')
    } catch (err: any) {
      showToast(err.message || 'Ошибка сохранения', 'error')
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleModalSave = async () => {
    const type = editingItem?.type ?? (formData.productSlugs.length > 0 ? 'collection' : 'news')
    if (!formData.title.trim()) {
      showToast('Укажите заголовок', 'error')
      return
    }
    if (type === 'news' && !formData.imageUrl.trim()) {
      showToast('Загрузите фото для новости', 'error')
      return
    }

    const payload: ContentItem = {
      id: editingItem?.id ?? (type === 'news' ? `news-${Date.now()}` : `col-${Date.now()}`),
      type,
      title: formData.title.trim(),
      body: formData.body.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      publishedAt: formData.publishedAt.trim() || undefined,
      active: formData.active,
      sort: editingItem?.sort ?? items.length,
      productSlugs: type === 'collection' ? formData.productSlugs : []
    }

    let nextItems: ContentItem[]
    if (editingItem) {
      nextItems = items.map((x) => (x.id === editingItem.id ? { ...payload, sort: x.sort } : x))
    } else {
      nextItems = [...items, { ...payload, sort: items.length }].map((it, i) => ({ ...it, sort: i }))
    }
    setItems(nextItems)
    setIsModalOpen(false)
    setSaving(true)
    try {
      await api.saveContent(nextItems)
      showToast('Сохранено', 'success')
    } catch (err: any) {
      showToast(err.message || 'Ошибка сохранения', 'error')
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await api.uploadImage(file)
      setFormData((prev) => ({ ...prev, imageUrl: uploaded.url }))
    } catch (err: any) {
      showToast(err.message || 'Ошибка загрузки фото', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const file = files[0]
    if (allowed.includes(file.type.toLowerCase())) {
      handleFileUpload(file)
    } else {
      showToast('Поддерживаются JPG, PNG, WebP', 'error')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // поиск товаров для подборки
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!productSearch.trim()) {
      setProductSearchResults([])
      return
    }
    searchTimeoutRef.current = setTimeout(() => {
      setProductSearching(true)
      api.getProducts(productSearch.trim())
        .then((data: { products?: Product[] }) => {
          setProductSearchResults(data.products || [])
        })
        .catch(() => setProductSearchResults([]))
        .finally(() => setProductSearching(false))
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [productSearch])

  const addProductToCollection = (slug: string) => {
    if (formData.productSlugs.includes(slug)) return
    setFormData((prev) => ({ ...prev, productSlugs: [...prev.productSlugs, slug] }))
  }

  const removeProductFromCollection = (slug: string) => {
    setFormData((prev) => ({ ...prev, productSlugs: prev.productSlugs.filter((s) => s !== slug) }))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((x) => x.id === active.id)
    const newIndex = items.findIndex((x) => x.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(items, oldIndex, newIndex).map((it, i) => ({ ...it, sort: i }))
    setItems(next)
    setSaving(true)
    try {
      await api.saveContent(next)
      showToast('Порядок сохранён', 'success')
    } catch (err: any) {
      showToast(err.message || 'Ошибка сохранения', 'error')
      load()
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    removeToken()
    window.location.reload()
  }

  if (loading) return <div className="loading">Загрузка...</div>

  const isNews = editingItem?.type === 'news'
  const isAdd = editingItem
    ? !editingItem.title?.trim() && (editingItem.id.startsWith('news-') || editingItem.id.startsWith('col-'))
    : true

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn" onClick={() => onNavigate?.('brands')}>Бренды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('lines')}>Линейки</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn" onClick={() => onNavigate?.('promocodes')}>Промокоды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>Заказы</button>
          <button className="nav-btn" onClick={() => onNavigate?.('users')}>Пользователи</button>
          <button className="nav-btn" onClick={() => onNavigate?.('referral')}>Реферальная система</button>
        </div>
        <button onClick={logout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content content-page">
        <div className="toolbar toolbar--transparent">
          <div className="toolbar-row-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-add" onClick={handleAddNews}>Добавить новость</button>
            <button type="button" className="btn btn-add" onClick={handleAddCollection}>Добавить подборку</button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
            <button className="toast-close" onClick={() => setToast(null)}>×</button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <p>Нет элементов в ленте. Добавьте новость или подборку.</p>
          </div>
        ) : (
          <div className="content-table-wrapper">
            <table className="categories-table content-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Тип</th>
                  <th>Фото</th>
                  <th>Заголовок</th>
                  <th>Дата</th>
                  <th>Активна</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item) => (
                      <SortableContentRow
                        key={item.id}
                        item={item}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-form content-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>
              {isAdd ? (isNews ? 'Добавить новость' : 'Добавить подборку') : (isNews ? 'Редактировать новость' : 'Редактировать подборку')}
            </h2>
            <div className="form-group">
              <label>Заголовок *</label>
              <input
                type="text"
                className="admin-input"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Заголовок"
              />
            </div>
            <div className="form-group">
              <label>{isNews ? 'Кратко (текст)' : 'Описание (опционально)'}</label>
              <textarea
                className="admin-input"
                value={formData.body}
                onChange={(e) => setFormData((p) => ({ ...p, body: e.target.value }))}
                placeholder={isNews ? 'Краткое описание' : 'Текст подборки'}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Фото {isNews ? '*' : '(опционально)'}</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="content-image-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="content-image-input" className="image-upload-button">
                  {uploading ? 'Загрузка...' : 'Загрузить фото'}
                </label>
                {formData.imageUrl && (
                  <div
                    className="category-form-preview"
                    style={{
                      backgroundImage: `url(${formData.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Дата (опционально)</label>
              <input
                type="date"
                className="admin-input"
                value={formData.publishedAt}
                onChange={(e) => setFormData((p) => ({ ...p, publishedAt: e.target.value }))}
              />
            </div>
            {!isNews && (
              <div className="form-group">
                <label>Товары в подборке</label>
                <input
                  type="text"
                  className="admin-input"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Поиск по названию, артикулу, slug"
                />
                {productSearching && <small>Поиск...</small>}
                {productSearchResults.length > 0 && (
                  <ul className="content-product-search-list">
                    {productSearchResults.map((p) => (
                      <li key={p.slug}>
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => addProductToCollection(p.slug)}
                          disabled={formData.productSlugs.includes(p.slug)}
                        >
                          + {p.title || p.slug} {p.article ? `(${p.article})` : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {formData.productSlugs.length > 0 && (
                  <ul className="content-product-selected">
                    {formData.productSlugs.map((slug) => (
                      <li key={slug}>
                        <span>{slug}</span>
                        <button type="button" className="btn-icon btn-delete" onClick={() => removeProductFromCollection(slug)} title="Убрать"><TrashIcon /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="form-group form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                />
                Активна
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button type="button" className="btn btn-confirm" onClick={handleModalSave}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
