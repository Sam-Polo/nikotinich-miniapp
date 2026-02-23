import { useState, useEffect, useMemo } from 'react'
import { api, removeToken } from './api'
import './App.css'

type User = {
  telegram_id: string
  username: string
  email: string
  phone: string
  role: string
  active: boolean
  referrer_id?: string
  referral_balance_rub?: number
}

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'content' | 'orders' | 'users' | 'referral'
type UserSortKey = 'telegram_id' | 'username' | 'email' | 'phone' | 'role' | 'active'

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

// иконка заказов (коробка/посылка)
const OrdersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

function UsersPage({ onNavigate }: { onNavigate?: (page: AdminPage, params?: { user_id?: string }) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [sortKey, setSortKey] = useState<UserSortKey>('telegram_id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [formData, setFormData] = useState<{
    telegram_id: string
    username: string
    email: string
    phone: string
    role: string
    active: boolean
  }>({
    telegram_id: '',
    username: '',
    email: '',
    phone: '',
    role: 'user',
    active: true
  })

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.getUsers() as { users: User[] }
      setUsers(res.users || [])
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка загрузки', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAdd = () => {
    setEditingUser(null)
    setFormData({
      telegram_id: '',
      username: '',
      email: '',
      phone: '',
      role: 'user',
      active: true
    })
    setIsModalOpen(true)
  }

  const handleEdit = (u: User) => {
    setEditingUser(u)
    setFormData({
      telegram_id: u.telegram_id,
      username: u.username,
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'user',
      active: u.active
    })
    setIsModalOpen(true)
  }

  const handleDeleteClick = (u: User) => setDeleteConfirm(u)

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      await api.deleteUser(deleteConfirm.telegram_id)
      setToast({ message: 'Пользователь удалён', type: 'success' })
      setDeleteConfirm(null)
      loadUsers()
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка удаления', type: 'error' })
    }
  }

  const handleSort = (key: UserSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'telegram_id':
          cmp = a.telegram_id.localeCompare(b.telegram_id)
          break
        case 'username':
          cmp = (a.username || '').localeCompare(b.username || '')
          break
        case 'email':
          cmp = (a.email || '').localeCompare(b.email || '')
          break
        case 'phone':
          cmp = (a.phone || '').localeCompare(b.phone || '')
          break
        case 'role':
          cmp = (a.role || '').localeCompare(b.role || '')
          break
        case 'active':
          cmp = (a.active ? 1 : 0) - (b.active ? 1 : 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [users, sortKey, sortDir])

  const th = (key: UserSortKey, label: string) => (
    <th>
      <button type="button" className="th-sort" onClick={() => handleSort(key)}>
        {label}
        {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )

  const handleSave = async () => {
    const telegramId = formData.telegram_id.trim()
    if (!telegramId) {
      setToast({ message: 'Укажите Telegram ID', type: 'error' })
      return
    }
    try {
      if (editingUser) {
        await api.updateUser({
          telegram_id: telegramId,
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role.trim() || 'user',
          active: formData.active
        })
        setToast({ message: 'Пользователь обновлён', type: 'success' })
      } else {
        await api.createUser({
          telegram_id: telegramId,
          username: formData.username.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role.trim() || 'user',
          active: formData.active
        })
        setToast({ message: 'Пользователь добавлен', type: 'success' })
      }
      setIsModalOpen(false)
      loadUsers()
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка сохранения', type: 'error' })
    }
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn" onClick={() => onNavigate?.('brands')}>Бренды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('lines')}>Линейки</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>Заказы</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('users')}>Пользователи</button>
          <button className="nav-btn" onClick={() => onNavigate?.('referral')}>Реферальная система</button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content">
        <div className="toolbar toolbar--transparent" style={{ marginBottom: '1rem', alignItems: 'flex-end' }}>
          <div className="toolbar-actions">
            <button type="button" className="btn btn-add" onClick={handleAdd}>Добавить пользователя</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p>Загрузка...</p></div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p>Нет пользователей.</p>
            <button type="button" className="btn btn-add" onClick={handleAdd}>Добавить пользователя</button>
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  {th('telegram_id', 'Telegram ID')}
                  {th('username', 'Username (TG)')}
                  {th('email', 'Email')}
                  {th('phone', 'Телефон')}
                  {th('role', 'Роль')}
                  {th('active', 'Активен')}
                  <th>Привёл</th>
                  <th>Реф. баланс</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => {
                  const referrer = u.referrer_id ? users.find((r) => r.telegram_id === u.referrer_id) : null
                  return (
                  <tr key={u.telegram_id}>
                    <td>{u.telegram_id}</td>
                    <td>{u.username ? `@${u.username.replace(/^@/, '')}` : '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.role || 'user'}</td>
                    <td>{u.active ? 'Да' : 'Нет'}</td>
                    <td>{referrer ? `@${referrer.username?.replace(/^@/, '') || referrer.telegram_id}` : '—'}</td>
                    <td>{u.referral_balance_rub != null ? `${u.referral_balance_rub} ₽` : '—'}</td>
                    <td>
                      <button type="button" className="btn-icon btn-orders" onClick={() => onNavigate?.('orders', { user_id: u.telegram_id })} title="Посмотреть заказы"><OrdersIcon /></button>
                      <button type="button" className="btn-icon btn-edit" onClick={() => handleEdit(u)} title="Редактировать"><EditIcon /></button>
                      <button type="button" className="btn-icon btn-delete" onClick={() => handleDeleteClick(u)} title="Удалить"><TrashIcon /></button>
                    </td>
                  </tr>
                )})}
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
            <h3>Удалить пользователя?</h3>
            <p>Пользователь {deleteConfirm.username ? `@${deleteConfirm.username}` : deleteConfirm.telegram_id} будет удалён. Это действие нельзя отменить.</p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button type="button" className="btn btn-confirm" onClick={handleDeleteConfirm}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>{editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}</h2>
            <div className="form-group">
              <label>Telegram ID *</label>
              <input
                type="text"
                value={formData.telegram_id}
                onChange={(e) => setFormData((p) => ({ ...p, telegram_id: e.target.value }))}
                placeholder="например: 123456789"
                disabled={!!editingUser}
              />
              {editingUser && <small className="form-hint">Идентификатор нельзя изменить</small>}
            </div>
            <div className="form-group">
              <label>Username (Telegram)</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value.replace(/^@/, '') }))}
                placeholder="без @"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+7..."
              />
            </div>
            <div className="form-group">
              <label>Роль</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                style={{ padding: '0.5rem' }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="form-group form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                />
                Активен
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                {editingUser ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
