import { useState, useEffect, useRef } from 'react'
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
import { normalizeKey, isValidKey } from './utils'
import './App.css'

type Brand = {
  category_key: string
  key: string
  title: string
  image: string
  order: number
}

type CategoryOption = { key: string; title: string }

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'content' | 'orders' | 'users'

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

function SortableBrandRow({
  brand,
  onEdit,
  onDelete,
  onGoToProducts
}: {
  brand: Brand
  onEdit: () => void
  onDelete: () => void
  onGoToProducts: () => void
}) {
  const sortId = `${brand.category_key}:${brand.key}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      <td><span className="drag-handle" {...attributes} {...listeners}>⋮⋮</span></td>
      <td>
        <div
          className="category-row-preview category-row-preview-square"
          style={{
            backgroundImage: brand.image ? `url(${brand.image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      </td>
      <td>
        <span
          role="button"
          tabIndex={0}
          className="nav-title-cell"
          onClick={(e) => { e.stopPropagation(); onGoToProducts() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoToProducts() } }}
        >
          {brand.title}
        </span>
      </td>
      <td>
        <button type="button" className="btn-icon btn-edit" onClick={onEdit} title="Редактировать"><EditIcon /></button>
        <button type="button" className="btn-icon btn-delete" onClick={onDelete} title="Удалить"><TrashIcon /></button>
      </td>
    </tr>
  )
}

function BrandsPage({ onNavigate }: { onNavigate?: (page: AdminPage, params?: { category_key?: string; brand_key?: string; line_key?: string }) => void }) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Brand | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState<{ category_key: string; key: string; title: string; image: string }>({
    category_key: '',
    key: '',
    title: '',
    image: ''
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayedBrands = selectedCategoryKey
    ? brands.filter((b) => b.category_key.toLowerCase() === selectedCategoryKey.toLowerCase())
    : []

  useEffect(() => {
    loadCategories()
    loadBrands()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await api.getCategories()
      const list = (data.categories || []).map((c: CategoryOption) => ({ key: c.key, title: c.title || c.key }))
      setCategories(list)
      if (list.length && !selectedCategoryKey) setSelectedCategoryKey(list[0].key)
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка загрузки категорий', type: 'error' })
    }
  }

  const loadBrands = async () => {
    try {
      setLoading(true)
      const data = await api.getBrands()
      const list = (data.brands || []).map((b: Brand, i: number) => ({ ...b, order: i }))
      setBrands(list)
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка загрузки брендов', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  const saveBrands = async (list: Brand[]) => {
    try {
      const toSend = list.map((b, i) => ({ ...b, order: i }))
      await api.saveBrands(toSend.map(({ category_key, key, title, image }) => ({
        category_key,
        key,
        title: title || key,
        image: image || ''
      })))
      setBrands(toSend)
      showToast('Бренды сохранены', 'success')
      loadBrands()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения', 'error')
    }
  }

  const handleAdd = () => {
    if (!selectedCategoryKey) {
      showToast('Сначала выберите категорию', 'error')
      return
    }
    setEditingBrand(null)
    setFormData({ category_key: selectedCategoryKey, key: '', title: '', image: '' })
    setIsModalOpen(true)
  }

  const handleEdit = (b: Brand) => {
    setEditingBrand(b)
    setFormData({
      category_key: b.category_key,
      key: b.key,
      title: b.title,
      image: b.image || ''
    })
    setIsModalOpen(true)
  }

  const handleDeleteClick = (b: Brand) => setDeleteConfirm(b)

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const next = brands.filter((b) => b.key !== deleteConfirm.key || b.category_key !== deleteConfirm.category_key).map((b, i) => ({ ...b, order: i }))
    setDeleteConfirm(null)
    await saveBrands(next)
  }

  const handleSave = async () => {
    const { category_key, key, title, image } = formData
    if (!key.trim()) {
      showToast('Укажите ключ бренда', 'error')
      return
    }
    const normalizedKey = normalizeKey(key)
    if (!isValidKey(normalizedKey)) {
      showToast('Только латиница, цифры, дефис и подчёркивание; без пробелов', 'error')
      return
    }
    if (!title.trim()) {
      showToast('Укажите название', 'error')
      return
    }
    const sameCategory = brands.filter((b) => b.category_key === category_key)
    const existing = sameCategory.find((b) => b.key.toLowerCase() === normalizedKey && (editingBrand?.key !== b.key || editingBrand?.category_key !== b.category_key))
    if (existing) {
      showToast('Бренд с таким ключом уже есть в этой категории', 'error')
      return
    }
    let next: Brand[]
    if (editingBrand) {
      next = brands.map((b) =>
        b.category_key === editingBrand.category_key && b.key === editingBrand.key
          ? { ...b, category_key, key: normalizedKey, title: title.trim(), image }
          : b
      )
    } else {
      next = [...brands, { category_key, key: normalizedKey, title: title.trim(), image, order: brands.length }]
    }
    await saveBrands(next)
    setIsModalOpen(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await api.uploadImage(file, { square: true })
      setFormData((prev) => ({ ...prev, image: uploaded.url }))
    } catch (e: any) {
      showToast(e?.message || 'Ошибка загрузки фото', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (allowed.includes(file.type.toLowerCase())) handleFileUpload(file)
    else showToast('Поддерживаются JPG, PNG, WebP', 'error')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const list = displayedBrands
    const oldIndex = list.findIndex((b) => b.key === active.id)
    const newIndex = list.findIndex((b) => b.key === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(list, oldIndex, newIndex)
    const other = brands.filter((b) => b.category_key.toLowerCase() !== selectedCategoryKey.toLowerCase())
    const next = [...other, ...reordered].map((b, i) => ({ ...b, order: i }))
    setBrands(next)
    saveBrands(next)
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn" onClick={() => onNavigate?.('promocodes')}>Промокоды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('brands')}>Бренды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('lines')}>Линейки</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>Заказы</button>
          <button className="nav-btn" onClick={() => onNavigate?.('users')}>Пользователи</button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="categories-content">
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
            </div>
          </div>
          <div className="toolbar-row-actions">
            <button type="button" className="btn btn-add" onClick={handleAdd}>Добавить бренд</button>
          </div>
        </div>
        <p className="categories-hint">
          Бренды привязаны к категории. Выберите категорию и управляйте брендами. Фото загружаются в формате 1:1.
        </p>
        {!selectedCategoryKey ? (
          <div className="empty-state"><p>Выберите категорию</p></div>
        ) : displayedBrands.length === 0 ? (
          <div className="empty-state">
            <p>Нет брендов в этой категории.</p>
            <button type="button" className="btn btn-add" onClick={handleAdd}>Добавить бренд</button>
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Фото</th>
                  <th>Название</th>
                  <th>Ключ</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={displayedBrands.map((b) => `${b.category_key}:${b.key}`)} strategy={verticalListSortingStrategy}>
                    {displayedBrands.map((brand) => (
                      <SortableBrandRow
                        key={`${brand.category_key}-${brand.key}`}
                        brand={brand}
                        onEdit={() => handleEdit(brand)}
                        onDelete={() => handleDeleteClick(brand)}
                        onGoToProducts={() => onNavigate?.('products', { category_key: brand.category_key, brand_key: brand.key })}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
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
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Удалить бренд?</h3>
            <p>Бренд «{deleteConfirm.title}» будет удалён.</p>
            <div className="confirm-actions">
              <button className="btn btn-cancel" onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button className="btn btn-confirm" onClick={handleDeleteConfirm}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>{editingBrand ? 'Редактировать бренд' : 'Добавить бренд'}</h2>
            <div className="form-group">
              <label>Категория</label>
              <select
                value={formData.category_key}
                onChange={(e) => setFormData((p) => ({ ...p, category_key: e.target.value }))}
                disabled={!!editingBrand}
                style={{ padding: '0.5rem' }}
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Vaporesso"
              />
            </div>
            <div className="form-group">
              <label>Ключ бренда *</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData((p) => ({ ...p, key: normalizeKey(e.target.value) }))}
                placeholder="например: vaporesso"
                disabled={!!editingBrand}
              />
              {formData.key.length > 0 && !isValidKey(formData.key) && (
                <small className="text-warning" style={{ color: '#856404' }}>Только латиница, цифры, дефис и подчёркивание; без пробелов</small>
              )}
            </div>
            <div className="form-group">
              <label>Фото (1:1)</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="brand-image-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="brand-image-input" className="image-upload-button">
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
            <div className="modal-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button type="button" className="btn btn-confirm" onClick={handleSave}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrandsPage
