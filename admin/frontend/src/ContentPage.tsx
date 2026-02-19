import { useEffect, useState } from 'react'
import { api, removeToken } from './api'
import './App.css'

type AdminPage = 'products' | 'promocodes' | 'categories' | 'catalogMeta' | 'content' | 'orders'
type NewsItem = { id: string; title: string; summary?: string; imageUrl?: string; active: boolean }
type CollectionItem = { id: string; title: string; description?: string; productSlugs: string[]; active: boolean }

export default function ContentPage({ onNavigate }: { onNavigate?: (page: AdminPage) => void }) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [tab, setTab] = useState<'news' | 'collections'>('news')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [newsData, collectionsData] = await Promise.all([api.getNews(), api.getCollections()])
      setNews(newsData.news || [])
      setCollections(collectionsData.collections || [])
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const saveNews = async () => {
    setSaving(true)
    try {
      await api.saveNews(news)
    } finally {
      setSaving(false)
    }
  }
  const saveCollections = async () => {
    setSaving(true)
    try {
      await api.saveCollections(collections)
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
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
          <button className="nav-btn" onClick={() => onNavigate?.('catalogMeta')}>Справочники</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>Заказы</button>
        </div>
        <button onClick={logout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content">
        <div className="toolbar">
          <div className="toolbar-filters">
            <button className={tab === 'news' ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab('news')}>Новости</button>
            <button className={tab === 'collections' ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab('collections')}>Подборки</button>
          </div>
          <div className="toolbar-actions">
            {tab === 'news' ? (
              <>
                <button className="btn-add" onClick={() => setNews((prev) => [...prev, { id: `${Date.now()}`, title: '', active: true }])}>+ Новость</button>
                <button className="btn-save" disabled={saving} onClick={saveNews}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
              </>
            ) : (
              <>
                <button className="btn-add" onClick={() => setCollections((prev) => [...prev, { id: `${Date.now()}`, title: '', productSlugs: [], active: true }])}>+ Подборка</button>
                <button className="btn-save" disabled={saving} onClick={saveCollections}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
              </>
            )}
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}

        {tab === 'news' ? (
          <table className="promocodes-table">
            <thead><tr><th>Заголовок</th><th>Кратко</th><th>Активна</th><th></th></tr></thead>
            <tbody>
              {news.map((item) => (
                <tr key={item.id}>
                  <td><input value={item.title} onChange={(e) => setNews((prev) => prev.map((x) => x.id === item.id ? { ...x, title: e.target.value } : x))} /></td>
                  <td><input value={item.summary || ''} onChange={(e) => setNews((prev) => prev.map((x) => x.id === item.id ? { ...x, summary: e.target.value } : x))} /></td>
                  <td><input type="checkbox" checked={item.active} onChange={(e) => setNews((prev) => prev.map((x) => x.id === item.id ? { ...x, active: e.target.checked } : x))} /></td>
                  <td><button className="btn-delete" onClick={() => setNews((prev) => prev.filter((x) => x.id !== item.id))}>Удалить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="promocodes-table">
            <thead><tr><th>Название</th><th>Slug товаров (через запятую)</th><th>Активна</th><th></th></tr></thead>
            <tbody>
              {collections.map((item) => (
                <tr key={item.id}>
                  <td><input value={item.title} onChange={(e) => setCollections((prev) => prev.map((x) => x.id === item.id ? { ...x, title: e.target.value } : x))} /></td>
                  <td><input value={item.productSlugs.join(',')} onChange={(e) => setCollections((prev) => prev.map((x) => x.id === item.id ? { ...x, productSlugs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : x))} /></td>
                  <td><input type="checkbox" checked={item.active} onChange={(e) => setCollections((prev) => prev.map((x) => x.id === item.id ? { ...x, active: e.target.checked } : x))} /></td>
                  <td><button className="btn-delete" onClick={() => setCollections((prev) => prev.filter((x) => x.id !== item.id))}>Удалить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
