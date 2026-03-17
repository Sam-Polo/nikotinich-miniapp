import { useEffect, useState, useRef, useCallback } from 'react'
import { api, removeToken } from './api'
import AdminNav from './components/AdminNav'
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

type AdminPage =
  | 'products'
  | 'promocodes'
  | 'categories'
  | 'brands'
  | 'lines'
  | 'models'
  | 'content'
  | 'orders'
  | 'users'
  | 'referral'

type ContentItemType = 'news' | 'collection'

type ContentItem = {
  id: string
  type: ContentItemType
  title: string
  body?: string
  imageUrl?: string
  images?: string[]
  publishedAt?: string
  active: boolean
  sort: number
  productSlugs: string[]
  showInStories?: boolean
  readMinutes?: number
  likes?: number
  claps?: number
  dislikes?: number
}

// допустимый диапазон дат для новостей и подборок: 2026–2027 годы включительно
const MIN_CONTENT_DATE = '2026-01-01'
const MAX_CONTENT_DATE = '2027-12-31'

type Product = { slug: string; title?: string; article?: string }

const EditIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const TrashIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      <td data-label="Сортировка">
        <span className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </span>
      </td>
      <td data-label="Тип" className="content-type-cell">
        {item.type === 'news' ? 'Новость' : 'Подборка'}
      </td>
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
      <td data-label="Заголовок" className="content-title-cell">
        {item.title || '—'}
      </td>
      <td data-label="Дата" className="content-date-cell">
        {item.publishedAt || '—'}
      </td>
      <td data-label="Лайки">{item.likes ?? 0}</td>
      <td data-label="Классы">{item.claps ?? 0}</td>
      <td data-label="Дизлайки">{item.dislikes ?? 0}</td>
      <td data-label="Активна">{item.active ? 'Да' : 'Нет'}</td>
      <td data-label="Действия">
        <button
          type="button"
          className="btn-icon btn-edit"
          onClick={onEdit}
          title="Редактировать"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="btn-icon btn-delete"
          onClick={onDelete}
          title="Удалить"
        >
          <TrashIcon />
        </button>
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
    images: string[]
    readMinutes: number | ''
    publishedAt: string
    active: boolean
    productSlugs: string[]
    showInStories: boolean
  }>({
    title: '',
    body: '',
    imageUrl: '',
    images: [],
    readMinutes: '',
    publishedAt: '',
    active: true,
    productSlugs: [],
    showInStories: false
  })
  const [deleteConfirm, setDeleteConfirm] = useState<ContentItem | null>(null)
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const extraImagesInputRef = useRef<HTMLInputElement>(null)
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
        images: item.images || [],
        readMinutes: item.readMinutes ?? '',
        publishedAt: item.publishedAt || '',
        active: item.active,
        productSlugs: item.productSlugs || [],
        showInStories: item.showInStories ?? false
      })
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        body: '',
        imageUrl: '',
        images: [],
        readMinutes: '',
        publishedAt: '',
        active: true,
        productSlugs: type === 'collection' ? [] : [],
        showInStories: false
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
      images: [],
      publishedAt: '',
      active: true,
      sort: items.length,
      productSlugs: [],
      showInStories: false,
      likes: 0,
      claps: 0,
      dislikes: 0
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
      images: [],
      publishedAt: '',
      active: true,
      sort: items.length,
      productSlugs: [],
      showInStories: false,
      likes: 0,
      claps: 0,
      dislikes: 0
    }
    setItems((prev) => [...prev, newItem])
    openModal(newItem, 'collection')
  }

  const handleEdit = (item: ContentItem) => {
    openModal(item, item.type)
  }

  const handleDeleteClick = (item: ContentItem) => {
    setDeleteConfirm(item)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const item = deleteConfirm
    setDeleteConfirm(null)
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
      showToast(
        'Выберите обложку из загруженных фото (или добавьте фото в текст)',
        'error'
      )
      return
    }

    const payload: ContentItem = {
      id: editingItem?.id ?? (type === 'news' ? `news-${Date.now()}` : `col-${Date.now()}`),
      type,
      title: formData.title.trim(),
      body: formData.body.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      images: formData.images.length > 0 ? formData.images : undefined,
      readMinutes: formData.readMinutes !== '' ? Number(formData.readMinutes) : undefined,
      publishedAt: formData.publishedAt.trim() || undefined,
      active: formData.active,
      sort: editingItem?.sort ?? items.length,
      productSlugs: type === 'collection' ? formData.productSlugs : [],
      showInStories: formData.showInStories,
      likes: editingItem?.likes ?? 0,
      claps: editingItem?.claps ?? 0,
      dislikes: editingItem?.dislikes ?? 0
    }

    let nextItems: ContentItem[]
    if (editingItem) {
      nextItems = items.map((x) => (x.id === editingItem.id ? { ...payload, sort: x.sort } : x))
    } else {
      nextItems = [...items, { ...payload, sort: items.length }].map((it, i) => ({
        ...it,
        sort: i
      }))
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

  const handleExtraImageUpload = async (file: File) => {
    setUploadingExtra(true)
    try {
      const uploaded = await api.uploadImage(file)
      setFormData((prev) => ({ ...prev, images: [...prev.images, uploaded.url] }))
    } catch (err: any) {
      showToast(err.message || 'Ошибка загрузки фото', 'error')
    } finally {
      setUploadingExtra(false)
    }
  }

  const handleExtraFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const file = files[0]
    if (allowed.includes(file.type.toLowerCase())) {
      handleExtraImageUpload(file)
    } else {
      showToast('Поддерживаются JPG, PNG, WebP', 'error')
    }
    if (extraImagesInputRef.current) extraImagesInputRef.current.value = ''
  }

  const removeExtraImage = (index: number) => {
    const removedUrl = formData.images[index]
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      imageUrl: prev.imageUrl === removedUrl ? '' : prev.imageUrl
    }))
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
      api
        .getProducts(productSearch.trim())
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
    setFormData((prev) => ({
      ...prev,
      productSlugs: prev.productSlugs.filter((s) => s !== slug)
    }))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
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
    ? !editingItem.title?.trim() &&
      (editingItem.id.startsWith('news-') || editingItem.id.startsWith('col-'))
    : true

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <AdminNav currentPage="content" onNavigate={(p) => onNavigate?.(p)} />
        <button onClick={logout} className="logout-btn">
          Выйти
        </button>
      </header>

      <div className="admin-content content-page">
        <div className="toolbar toolbar--transparent">
          <div
            className="toolbar-row-actions"
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
          >
            <button type="button" className="btn btn-add" onClick={handleAddNews}>
              Добавить новость
            </button>
            <button type="button" className="btn btn-add" onClick={handleAddCollection}>
              Добавить подборку
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
            <button className="toast-close" onClick={() => setToast(null)}>
              ×
            </button>
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
                  <th>Лайки</th>
                  <th>Классы</th>
                  <th>Дизлайки</th>
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
                        onDelete={() => handleDeleteClick(item)}
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
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
        >
          <div className="modal-content modal-form content-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              ×
            </button>
            <h2>
              {isAdd
                ? isNews
                  ? 'Добавить новость'
                  : 'Добавить подборку'
                : isNews
                  ? 'Редактировать новость'
                  : 'Редактировать подборку'}
            </h2>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label>Заголовок *</label>
              <input
                type="text"
                className="admin-input"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Заголовок"
              />
            </div>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label>{isNews ? 'Текст статьи' : 'Описание (опционально)'}</label>
              <textarea
                className="admin-input"
                value={formData.body}
                onChange={(e) => setFormData((p) => ({ ...p, body: e.target.value }))}
                placeholder={isNews ? 'Текст с форматированием' : 'Текст подборки'}
                rows={5}
              />
              <small className="form-hint" style={{ display: 'block', marginTop: 6 }}>
                Для вставки фото по месту используйте <strong>{'{{img1}}'}</strong>,{' '}
                <strong>{'{{img2}}'}</strong> и т.д. по порядку загруженных фото ниже. Форматирование:
                заголовки (# Заголовок), списки (- пункт или 1. пункт), жирный (**текст**), наклонный
                (*текст*). Ссылки: <strong>{'[текст](https://...)'}</strong> — в миниапп отображаются синим, по нажатию открываются.
              </small>
            </div>

            <div className="form-group">
              <label>Доп. фото для текста</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  ref={extraImagesInputRef}
                  id="content-extra-images-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleExtraFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="content-extra-images-input" className="image-upload-button">
                  {uploadingExtra ? 'Загрузка...' : 'Добавить фото в текст'}
                </label>
                {formData.images.length > 0 && (
                  <ul
                    className="content-extra-images-list"
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      listStyle: 'none',
                      paddingLeft: 0
                    }}
                  >
                    {formData.images.map((url, idx) => {
                      const marker = `{{img${idx + 1}}}`
                      return (
                        <li key={url} style={{ position: 'relative' }}>
                          <div
                            className="category-form-preview"
                            style={{
                              width: 80,
                              height: 80,
                              backgroundImage: `url(${url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: 8
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 2
                            }}
                          >
                            <span style={{ fontSize: 11 }}>{marker}</span>
                            <button
                              type="button"
                              className="btn-icon btn-edit"
                              style={{ width: 24, height: 24, minWidth: 24 }}
                              onClick={() => {
                                navigator.clipboard.writeText(marker)
                                showToast('Скопировано', 'success')
                              }}
                              title="Копировать в буфер"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                          <button
                            type="button"
                            className="btn-icon btn-delete"
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: '#fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                            onClick={() => removeExtraImage(idx)}
                            title="Удалить"
                          >
                            <TrashIcon />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Обложка {isNews ? '*' : '(опционально)'}</label>
              {formData.images.length === 0 ? (
                <p className="form-hint" style={{ marginTop: 4 }}>
                  Сначала добавьте фото в текст выше — затем выберите обложку из списка.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 6
                  }}
                >
                  <label
                    className="content-cover-option"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="cover"
                      checked={!formData.imageUrl}
                      onChange={() => setFormData((p) => ({ ...p, imageUrl: '' }))}
                    />
                    <span>Без обложки</span>
                  </label>
                  {formData.images.map((url) => (
                    <label
                      key={url}
                      className="content-cover-option"
                      style={{
                        cursor: 'pointer',
                        border:
                          formData.imageUrl === url
                            ? '2px solid var(--admin-accent)'
                            : '1px solid #ddd',
                        borderRadius: 8,
                        overflow: 'hidden',
                        width: 100,
                        height: 56,
                        position: 'relative'
                      }}
                    >
                      <input
                        type="radio"
                        name="cover"
                        checked={formData.imageUrl === url}
                        onChange={() => setFormData((p) => ({ ...p, imageUrl: url }))}
                        style={{ position: 'absolute', opacity: 0 }}
                      />
                      <div
                        className="category-form-preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url(${url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {formData.body.trim() || formData.images.length > 0 ? (
              <div className="form-group">
                <label>Предпросмотр (как в мини-приложении)</label>
                <div
                  className="content-preview-box"
                  style={{
                    maxHeight: 280,
                    overflow: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    lineHeight: 1.5
                  }}
                >
                  {(() => {
                    const body = formData.body || ''
                    const images = formData.images || []
                    const parts = body.split(/(\{\{img\d+\}\})/gi)
                    return parts.map((segment, i) => {
                      const m = segment.match(/\{\{img(\d+)\}\}/i)
                      if (m) {
                        const num = parseInt(m[1], 10)
                        const src = images[num - 1]
                        return src ? (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            style={{
                              width: '100%',
                              maxHeight: 160,
                              objectFit: 'cover',
                              margin: '8px 0',
                              borderRadius: 4
                            }}
                          />
                        ) : (
                          <span key={i} style={{ color: '#999' }}>
                            [Фото {num}]
                          </span>
                        )
                      }
                      return (
                        <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                          {segment.split(/\n/).map((line, j) => {
                            const t = line.trim()
                            if (t.startsWith('## ')) {
                              return (
                                <div
                                  key={j}
                                  style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}
                                >
                                  {t.slice(3)}
                                </div>
                              )
                            }
                            if (t.startsWith('# ')) {
                              return (
                                <div
                                  key={j}
                                  style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}
                                >
                                  {t.slice(2)}
                                </div>
                              )
                            }
                            if (/^\d+\.\s/.test(t)) {
                              return (
                                <div key={j} style={{ marginLeft: 8 }}>
                                  {t}
                                </div>
                              )
                            }
                            if (t.startsWith('- ')) {
                              return (
                                <div key={j} style={{ marginLeft: 8 }}>
                                  — {t.slice(2)}
                                </div>
                              )
                            }
                            if (t) {
                              return (
                                <div
                                  key={j}
                                  dangerouslySetInnerHTML={{
                                    __html: t
                                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                                  }}
                                />
                              )
                            }
                            return <br key={j} />
                          })}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            ) : null}

            <div className="form-group">
              <label>Время на прочтение (мин)</label>
              <input
                type="number"
                min={1}
                className="admin-input"
                value={formData.readMinutes}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    readMinutes: e.target.value === '' ? '' : Number(e.target.value)
                  }))
                }
                placeholder="авто по тексту"
              />
            </div>

            <div className="form-group">
              <label>Дата (опционально)</label>
              <input
                type="date"
                className="admin-input"
                value={formData.publishedAt}
                min={MIN_CONTENT_DATE}
                max={MAX_CONTENT_DATE}
                onChange={(e) => {
                  const value = e.target.value
                  // пустое значение — снимаем дату
                  if (!value) {
                    setFormData((p) => ({ ...p, publishedAt: '' }))
                    return
                  }
                  // жёстко ограничиваем диапазон 2026–2027
                  if (value < MIN_CONTENT_DATE || value > MAX_CONTENT_DATE) {
                    return
                  }
                  setFormData((p) => ({ ...p, publishedAt: value }))
                }}
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
                        <button
                          type="button"
                          className="btn-icon btn-delete"
                          onClick={() => removeProductFromCollection(slug)}
                          title="Убрать"
                        >
                          <TrashIcon />
                        </button>
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

            <div className="form-group form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showInStories}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, showInStories: e.target.checked }))
                  }
                />
                Отображать в верхней ленте
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => setIsModalOpen(false)}
              >
                Отмена
              </button>
              <button type="button" className="btn btn-confirm" onClick={handleModalSave}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null)
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
              ×
            </button>
            <h2>Удалить {deleteConfirm.type === 'news' ? 'новость' : 'подборку'}?</h2>
            <p>«{deleteConfirm.title}» будет удалён из ленты. Это действие нельзя отменить.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-delete"
                onClick={handleDeleteConfirm}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

