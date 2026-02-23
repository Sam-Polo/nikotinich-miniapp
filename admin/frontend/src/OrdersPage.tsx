import { useEffect, useState, useMemo } from 'react'
import { api, removeToken } from './api'
import './App.css'

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'content' | 'orders' | 'users' | 'referral'
type OrderStatus = 'new' | 'confirmed' | 'packed' | 'completed' | 'cancelled'
type Order = {
  id: string
  userId?: string
  customerName: string
  phone?: string
  address?: string
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
  completed: 'Выполнен',
  cancelled: 'Отменен'
}

type SortKey = 'id' | 'customerName' | 'totalRub' | 'status' | 'createdAt'
type StatsTab = 'orders' | 'statistics'

const ADDRESS_MAX_SHOW = 45
const ORDERS_PAGE_SIZE = 20

function truncateAddress(s: string): string {
  if (!s) return '—'
  return s.length <= ADDRESS_MAX_SHOW ? s : s.slice(0, ADDRESS_MAX_SHOW) + '…'
}

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
  const [totalOrders, setTotalOrders] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [statsTab, setStatsTab] = useState<StatsTab>('orders')
  const [salesPeriod, setSalesPeriod] = useState<'7d' | '30d' | 'all'>('30d')
  const [visitsPeriod, setVisitsPeriod] = useState<'7d' | '30d' | 'all'>('30d')
  const [visitsStats, setVisitsStats] = useState<{ uniqueUsersPeriod: number; uniqueUsersAllTime: number } | null>(null)
  const [visitsLoading, setVisitsLoading] = useState(false)

  useEffect(() => {
    load(0)
  }, [filterUserId, filterStatus])

  useEffect(() => {
    api.getUsers().then((res: { users?: UserOption[] }) => setUsers(res.users || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (initialOrderUserId) {
      setFilterUserId(initialOrderUserId)
      onClearInitialOrderUserId?.()
    }
  }, [initialOrderUserId])

  useEffect(() => {
    if (statsTab !== 'statistics') return
    setVisitsLoading(true)
    api.getVisitsStats(visitsPeriod)
      .then((data: { uniqueUsersPeriod?: number; uniqueUsersAllTime?: number }) =>
        setVisitsStats({
          uniqueUsersPeriod: data.uniqueUsersPeriod ?? 0,
          uniqueUsersAllTime: data.uniqueUsersAllTime ?? 0
        })
      )
      .catch(() => setVisitsStats({ uniqueUsersPeriod: 0, uniqueUsersAllTime: 0 }))
      .finally(() => setVisitsLoading(false))
  }, [statsTab, visitsPeriod])

  const load = async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      const data = await api.getOrders({
        userId: filterUserId || undefined,
        status: filterStatus || undefined,
        limit: ORDERS_PAGE_SIZE,
        offset
      }) as { orders?: Order[]; total?: number }
      const list = data.orders || []
      const total = data.total ?? 0
      if (offset === 0) setOrders(list)
      else setOrders((prev) => [...prev, ...list])
      setTotalOrders(total)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки заказов')
      if (offset === 0) setOrders([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(id, status)
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
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
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((o) => {
        const id = (o.id || '').toLowerCase()
        const name = (o.customerName || '').toLowerCase()
        const phone = (o.phone || '').toLowerCase()
        const address = (o.address || '').toLowerCase()
        const statusLabel = (statusLabels[o.status] || '').toLowerCase()
        const sum = String(o.totalRub || '')
        const created = o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU').toLowerCase() : ''
        return id.includes(q) || name.includes(q) || phone.includes(q) || address.includes(q) ||
          statusLabel.includes(q) || sum.includes(q) || created.includes(q)
      })
    }
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
  }, [orders, filterUserId, filterStatus, searchQuery, sortKey, sortDir])

  // границы периода для фильтра по дате (по createdAt заказа)
  const salesDateRange = useMemo(() => {
    const now = new Date()
    const toDate = now.toISOString().slice(0, 10)
    if (salesPeriod === 'all') return { fromDate: '', toDate }
    const from = new Date(now)
    from.setDate(from.getDate() - (salesPeriod === '7d' ? 7 : 30))
    return { fromDate: from.toISOString().slice(0, 10), toDate }
  }, [salesPeriod])

  // заказы за выбранный период (по дате создания)
  const filteredOrdersByPeriod = useMemo(() => {
    if (!salesDateRange.fromDate) return filteredOrders
    return filteredOrders.filter((o) => {
      const d = o.createdAt.slice(0, 10)
      return d >= salesDateRange.fromDate && d <= salesDateRange.toDate
    })
  }, [filteredOrders, salesDateRange])

  // статистика по продажам за период (без отменённых)
  const salesOrders = useMemo(() => filteredOrdersByPeriod.filter((o) => o.status !== 'cancelled'), [filteredOrdersByPeriod])
  const salesTotal = useMemo(() => salesOrders.reduce((s, o) => s + o.totalRub, 0), [salesOrders])
  const salesCount = salesOrders.length
  const salesAvg = salesCount > 0 ? Math.round(salesTotal / salesCount) : 0
  const salesByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    filteredOrdersByPeriod.forEach((o) => {
      m[o.status] = (m[o.status] || 0) + 1
    })
    return m
  }, [filteredOrdersByPeriod])

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
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn" onClick={() => onNavigate?.('brands')}>Бренды</button>
          <button className="nav-btn" onClick={() => onNavigate?.('lines')}>Линейки</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('orders')}>Заказы</button>
          <button className="nav-btn" onClick={() => onNavigate?.('users')}>Пользователи</button>
          <button className="nav-btn" onClick={() => onNavigate?.('referral')}>Реферальная система</button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content orders-page">
        <div className="toolbar toolbar--transparent">
          <div className="toolbar-tabs">
            <button
              type="button"
              className={statsTab === 'orders' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setStatsTab('orders')}
            >
              Заказы
            </button>
            <button
              type="button"
              className={statsTab === 'statistics' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setStatsTab('statistics')}
            >
              Статистика
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {statsTab === 'orders' ? (
          <>
            <div className="toolbar toolbar--transparent" style={{ marginTop: '0.5rem' }}>
              <div className="toolbar-row-filters toolbar-row-filters--orders">
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
                <label className="toolbar-search-orders">
                  <span className="toolbar-search-orders-label">Поиск</span>
                  <input
                    type="search"
                    className="admin-input orders-search-input"
                    placeholder="По заказам..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="orders-table-wrapper">
              <table className="promocodes-table orders-table">
                <thead>
                  <tr>
                    {th('id', 'ID')}
                    {th('customerName', 'Клиент')}
                    <th>Телефон</th>
                    {th('totalRub', 'Сумма')}
                    <th>Адрес</th>
                    {th('status', 'Статус')}
                    {th('createdAt', 'Создан')}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="ID">{order.id.slice(0, 8)}</td>
                      <td data-label="Клиент">{order.customerName}</td>
                      <td data-label="Телефон">{order.phone || '—'}</td>
                      <td data-label="Сумма">{order.totalRub} ₽</td>
                      <td className="orders-address-cell" data-label="Адрес" title={order.address || undefined}>
                        {truncateAddress(order.address || '')}
                      </td>
                      <td data-label="Статус">
                        <select
                          className="admin-select"
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Создан">{new Date(order.createdAt).toLocaleString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length < totalOrders && (
              <div className="orders-load-more">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loadingMore}
                  onClick={() => load(orders.length)}
                >
                  {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="stats-page">
            <section className="stats-section">
              <h2 className="stats-section-title">Продажи</h2>
              <div className="stats-period-select">
                <label>
                  Период:
                  <select
                    className="admin-select"
                    value={salesPeriod}
                    onChange={(e) => setSalesPeriod(e.target.value as '7d' | '30d' | 'all')}
                  >
                    <option value="7d">7 дней</option>
                    <option value="30d">30 дней</option>
                    <option value="all">Всё время</option>
                  </select>
                </label>
              </div>
              <div className="stats-cards stats-cards--circle">
                <div className="stats-card stats-card--circle">
                  <span className="stats-card-label">Выручка</span>
                  <span className="stats-card-value">{salesTotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="stats-card stats-card--circle">
                  <span className="stats-card-label">Заказов</span>
                  <span className="stats-card-value">{salesCount}</span>
                </div>
                <div className="stats-card stats-card--circle">
                  <span className="stats-card-label">Средний чек</span>
                  <span className="stats-card-value">{salesAvg.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
              <div className="stats-by-status">
                <h3 className="stats-subtitle">По статусам (за выбранный период)</h3>
                <ul className="stats-status-list">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <li key={status}>
                      <span>{label}</span>
                      <strong>{salesByStatus[status] ?? 0}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="stats-section">
              <h2 className="stats-section-title">Посещения</h2>
              <p className="stats-hint">Уникальные пользователи мини-приложения (данные поступают при открытии приложения).</p>
              <div className="stats-period-select">
                <label>
                  Период:
                  <select
                    className="admin-select"
                    value={visitsPeriod}
                    onChange={(e) => setVisitsPeriod(e.target.value as '7d' | '30d' | 'all')}
                  >
                    <option value="7d">7 дней</option>
                    <option value="30d">30 дней</option>
                    <option value="all">Всё время</option>
                  </select>
                </label>
              </div>
              {visitsLoading ? (
                <div className="stats-loading">Загрузка...</div>
              ) : (
                <div className="stats-cards stats-cards--circle">
                  <div className="stats-card stats-card--circle">
                    <span className="stats-card-label">
                      За {visitsPeriod === '7d' ? '7 дней' : visitsPeriod === '30d' ? '30 дней' : 'всё время'}
                    </span>
                    <span className="stats-card-value">{visitsStats?.uniqueUsersPeriod ?? 0}</span>
                  </div>
                  <div className="stats-card stats-card--circle">
                    <span className="stats-card-label">За всё время</span>
                    <span className="stats-card-value">{visitsStats?.uniqueUsersAllTime ?? 0}</span>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
