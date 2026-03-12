import { useEffect, useState, useMemo, useRef } from 'react'
import { api, removeToken } from './api'
import AdminNav from './components/AdminNav'
import './App.css'

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

// выпадающий список пользователей с поиском (combobox)
function UserSearchSelect({
  users,
  value,
  onChange
}: {
  users: UserOption[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // текущий выбранный пользователь
  const selected = users.find(u => u.telegram_id === value)
  const displayLabel = selected
    ? (selected.username ? `@${selected.username}` : selected.telegram_id)
    : 'Все'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      u.telegram_id.includes(q)
    )
  }, [users, query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelect = (telegramId: string) => {
    onChange(telegramId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="user-search-select" style={{ position: 'relative', display: 'inline-block', minWidth: '180px' }}>
      <button
        type="button"
        className="admin-select user-search-trigger"
        onClick={handleOpen}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        {displayLabel}
        <span style={{ float: 'right', opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div className="user-search-dropdown" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #ddd', borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: '260px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск по @username или ID..."
              style={{ width: '100%', border: '1px solid #ccc', borderRadius: '4px', padding: '4px 8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
            <div
              className={`user-search-option${value === '' ? ' selected' : ''}`}
              style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '13px', background: value === '' ? '#f0f8ff' : '' }}
              onMouseDown={() => handleSelect('')}
            >
              Все пользователи
            </div>
            {filtered.map(u => (
              <div
                key={u.telegram_id}
                className={`user-search-option${value === u.telegram_id ? ' selected' : ''}`}
                style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '13px', background: value === u.telegram_id ? '#f0f8ff' : '' }}
                onMouseDown={() => handleSelect(u.telegram_id)}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = value === u.telegram_id ? '#f0f8ff' : '')}
              >
                {u.username ? `@${u.username}` : u.telegram_id}
                <span style={{ color: '#999', marginLeft: '6px', fontSize: '11px' }}>{u.telegram_id}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: '#999', fontSize: '13px' }}>Не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [salesPeriod, setSalesPeriod] = useState<'7d' | '30d' | 'month' | 'all'>('30d')
  const [salesMonth, setSalesMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [visitsPeriod, setVisitsPeriod] = useState<'7d' | '30d' | 'all'>('30d')
  const [visitsStats, setVisitsStats] = useState<{ uniqueUsersPeriod: number; uniqueUsersAllTime: number } | null>(null)
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

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

  const deleteOrder = async (id: string) => {
    try {
      await api.deleteOrder(id)
      setOrders(prev => prev.filter(o => o.id !== id))
      setTotalOrders(prev => prev - 1)
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления заказа')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllOnPage = () => {
    const pageIds = filteredOrders.map(o => o.id)
    const allSelected = pageIds.every(id => selectedOrderIds.includes(id))
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const bulkDelete = async () => {
    const ids = selectedOrderIds
    if (ids.length === 0) {
      setBulkDeleteConfirm(false)
      return
    }
    try {
      await api.bulkDeleteOrders(ids)
      setOrders(prev => prev.filter(o => !ids.includes(o.id)))
      setTotalOrders(prev => Math.max(0, prev - ids.length))
      setSelectedOrderIds([])
    } catch (err: any) {
      setError(err.message || 'Ошибка массового удаления')
    } finally {
      setBulkDeleteConfirm(false)
    }
  }

  // границы периода для фильтра по дате (по createdAt заказа)
  const salesDateRange = useMemo(() => {
    const now = new Date()
    const toDate = now.toISOString().slice(0, 10)
    if (salesPeriod === 'all') return { fromDate: '', toDate }
    if (salesPeriod === 'month') {
      const [y, m] = salesMonth.split('-').map(Number)
      const from = new Date(y, m - 1, 1)
      const to = new Date(y, m, 0) // последний день месяца
      return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) }
    }
    const from = new Date(now)
    from.setDate(from.getDate() - (salesPeriod === '7d' ? 7 : 30))
    return { fromDate: from.toISOString().slice(0, 10), toDate }
  }, [salesPeriod, salesMonth])

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
        <AdminNav currentPage="orders" onNavigate={(p) => onNavigate?.(p)} />
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
                    <UserSearchSelect users={users} value={filterUserId} onChange={setFilterUserId} />
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
                <div className="toolbar-row-actions">
                  <div className="toolbar-bulk-actions">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                        onChange={toggleSelectAllOnPage}
                      />
                      <span>Выбрать все на странице</span>
                    </label>
                    <button
                      type="button"
                      className="btn-delete-selected"
                      disabled={selectedOrderIds.length === 0}
                      onClick={() => setBulkDeleteConfirm(true)}
                    >
                      Удалить выбранные
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="orders-table-wrapper">
              <table className="promocodes-table orders-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                        onChange={toggleSelectAllOnPage}
                      />
                    </th>
                    {th('id', 'ID')}
                    {th('customerName', 'Клиент')}
                    <th>Телефон</th>
                    {th('totalRub', 'Сумма')}
                    <th>Адрес</th>
                    {th('status', 'Статус')}
                    {th('createdAt', 'Создан')}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                        />
                      </td>
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
                      <td>
                        <button
                          className="btn-icon btn-delete"
                          title="Удалить заказ"
                          onClick={() => setDeleteConfirm({ id: order.id, name: order.customerName })}
                        >
                          <TrashIcon />
                        </button>
                      </td>
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
              <div className="stats-period-select" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Период:
                  <select
                    className="admin-select"
                    value={salesPeriod}
                    onChange={(e) => setSalesPeriod(e.target.value as '7d' | '30d' | 'month' | 'all')}
                  >
                    <option value="7d">7 дней</option>
                    <option value="30d">30 дней</option>
                    <option value="month">По месяцу</option>
                    <option value="all">Всё время</option>
                  </select>
                </label>
                {salesPeriod === 'month' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Месяц:
                    <input
                      type="month"
                      className="admin-select"
                      value={salesMonth}
                      onChange={e => setSalesMonth(e.target.value)}
                      style={{ padding: '4px 8px' }}
                    />
                  </label>
                )}
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

      {deleteConfirm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null)
          }}
        >
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Подтверждение</h3>
            <p>Удалить заказ клиента <strong>{deleteConfirm.name}</strong>? Это действие необратимо.</p>
            <div className="confirm-actions">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-cancel">Отмена</button>
              <button onClick={() => deleteOrder(deleteConfirm.id)} className="btn btn-confirm">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBulkDeleteConfirm(false)
          }}
        >
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Массовое удаление</h3>
            <p>
              Удалить выбранные заказы (<strong>{selectedOrderIds.length}</strong> шт.)? Это действие необратимо.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setBulkDeleteConfirm(false)} className="btn btn-cancel">Отмена</button>
              <button onClick={bulkDelete} className="btn btn-confirm">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
