import { useEffect, useState } from 'react'
import { api, removeToken } from './api'
import './App.css'

type AdminPage = 'products' | 'promocodes' | 'categories' | 'catalogMeta' | 'content' | 'orders'
type OrderStatus = 'new' | 'confirmed' | 'packed' | 'delivered' | 'cancelled'
type Order = {
  id: string
  customerName: string
  phone?: string
  totalRub: number
  deliveryFee: number
  status: OrderStatus
  createdAt: string
  confirmedAt?: string
}

const statusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтвержден',
  packed: 'Собран',
  delivered: 'Доставлен',
  cancelled: 'Отменен'
}

export default function OrdersPage({ onNavigate }: { onNavigate?: (page: AdminPage) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

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
          <button className="nav-btn" onClick={() => onNavigate?.('catalogMeta')}>Справочники</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('orders')}>Заказы</button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}
        <table className="promocodes-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент</th>
              <th>Телефон</th>
              <th>Сумма</th>
              <th>Доставка</th>
              <th>Статус</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
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
