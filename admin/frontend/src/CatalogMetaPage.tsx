import { useEffect, useState } from 'react'
import { api, removeToken } from './api'
import './App.css'

type MetaType = 'brand' | 'line' | 'model' | 'flavor'
type MetaItem = {
  id: string
  type: MetaType
  parentId?: string
  title: string
  slug?: string
  imageUrl?: string
  active: boolean
}

type AdminPage = 'products' | 'promocodes' | 'categories' | 'catalogMeta' | 'content' | 'orders'

export default function CatalogMetaPage({ onNavigate }: { onNavigate?: (page: AdminPage) => void }) {
  const [items, setItems] = useState<MetaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await api.getCatalogMeta()
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const save = async (next: MetaItem[]) => {
    try {
      setSaving(true)
      await api.saveCatalogMeta(next)
      setItems(next)
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const addRow = () => {
    const id = `${Date.now()}-${Math.random()}`
    setItems((prev) => [...prev, { id, type: 'brand', title: '', active: true }])
  }

  const updateRow = (id: string, patch: Partial<MetaItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeRow = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('catalogMeta')}>Справочники</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>Заказы</button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content">
        <div className="toolbar">
          <div className="toolbar-actions">
            <button className="btn-add" onClick={addRow}>+ Добавить элемент</button>
            <button className="btn-save" disabled={saving} onClick={() => save(items)}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <table className="promocodes-table">
          <thead>
            <tr>
              <th>Тип</th>
              <th>Название</th>
              <th>Slug</th>
              <th>Parent ID</th>
              <th>Активен</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <select value={item.type} onChange={(e) => updateRow(item.id, { type: e.target.value as MetaType })}>
                    <option value="brand">brand</option>
                    <option value="line">line</option>
                    <option value="model">model</option>
                    <option value="flavor">flavor</option>
                  </select>
                </td>
                <td><input value={item.title} onChange={(e) => updateRow(item.id, { title: e.target.value })} /></td>
                <td><input value={item.slug || ''} onChange={(e) => updateRow(item.id, { slug: e.target.value })} /></td>
                <td><input value={item.parentId || ''} onChange={(e) => updateRow(item.id, { parentId: e.target.value || undefined })} /></td>
                <td>
                  <input type="checkbox" checked={item.active} onChange={(e) => updateRow(item.id, { active: e.target.checked })} />
                </td>
                <td><button className="btn-delete" onClick={() => removeRow(item.id)}>Удалить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
