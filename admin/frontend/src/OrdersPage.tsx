import { useEffect, useState, useMemo } from 'react'
import { api, removeToken } from './api'
import './App.css'

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'content' | 'orders' | 'users'
type OrderStatus = 'new' | 'confirmed' | 'packed' | 'delivered' | 'cancelled'
type Order = {
  id: string
  userId?: string
  customerName: string
  phone?: string
  totalRub: number
  deliveryFee: number
  status: OrderStatus
  createdAt: string
  confirmedAt?: string
}

type UserOption = { telegram_id: string; username: string }

const statusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтвержден',
  packed: 'Собран',
  delivered: 'Доставлен',
  cancelled: 'Отменен'
}

type SortKey = 'id' | 'customerName' | 'totalRub' | 'status' | 'createdAt'

export default function OrdersPage({
  onNavigate,
  initialOrderUserId,
  onClearInitialOrderUserId
}: {
  onNavigate?: (page: AdminPage, params?: { user_id?: string }) => void
  initialOrderUserId?: string | null
  onClearInitialOrderUserId?: () => void
}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    api.getUsers().then((res: { users?: UserOption[] }) => setUsers(res.users || [])).catch(() => {})
  }, [])

  // применение начального фильтра по пользователю (переход из раздела Пользователи)
  useEffect(() => {
    if (initialOrderUserId) {
      setFilterUserId(initialOrderUserId)
      onClearInitialOrderUserId?.()
    }
  }, [initialOrderUserId])

  const load = async () => {
    try {
      setLoading(true)
      const data = await api.getOrders()
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки заказов')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(id, status)
      await load()
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления статуса')
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'createdAt' ? 'desc' : 'asc')
    }
  }

  const filteredOrders = useMemo(() => {
    let list = orders
    if (filterUserId) list = list.filter((o) => o.userId === filterUserId)
    if (filterStatus) list = list.filter((o) => o.status === filterStatus)
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'id':
          cmp = a.id.localeCompare(b.id)
          break
        case 'customerName':
          cmp = (a.customerName || '').localeCompare(b.customerName || '')
          break
        case 'totalRub':
          cmp = a.totalRub - b.totalRub
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'createdAt':
        default:
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [orders, filterUserId, filterStatus, sortKey, sortDir])

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  const th = (key: SortKey, label: string) => (
    <th>
      <button type="button" className="th-sort" onClick={() => handleSort(key)}>
        {label}
        {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn" onClick={() => onNavigate?.('promocodes')}>Промокоды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn" onClick={() => onNavigate?.('brands')}>Бренды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('lines')}>Линейки</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('orders')}>Заказы</button>
          <button className="nav-btn" onClick={() => onNavigate?.('users')}>Пользователи</button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}
        <div className="toolbar">
          <div className="toolbar-row-filters">
            <div className="toolbar-filters">
              <label>
                Пользователь:
                <select
                  className="admin-select"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                >
                  <option value="">Все</option>
                  {users.map((u) => (
                    <option key={u.telegram_id} value={u.telegram_id}>
                      {u.username ? `@${u.username}` : u.telegram_id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Статус:
                <select
                  className="admin-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Все</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
        <table className="promocodes-table">
          <thead>
            <tr>
              {th('id', 'ID')}
              {th('customerName', 'Клиент')}
              <th>Телефон</th>
              {th('totalRub', 'Сумма')}
              <th>Доставка</th>
              {th('status', 'Статус')}
              {th('createdAt', 'Создан')}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id.slice(0, 8)}</td>
                <td>{order.customerName}</td>
                <td>{order.phone || '—'}</td>
                <td>{order.totalRub} ₽</td>
                <td>{order.deliveryFee} ₽</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td>{new Date(order.createdAt).toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
