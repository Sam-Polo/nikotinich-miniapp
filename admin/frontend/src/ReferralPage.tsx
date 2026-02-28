import { useState, useEffect } from 'react'
import { api, removeToken } from './api'
import AdminNav from './components/AdminNav'
import './App.css'

type AdminPage = 'products' | 'promocodes' | 'categories' | 'brands' | 'lines' | 'content' | 'orders' | 'users' | 'referral'

type OrdersSettings = {
  deliveryFee: number
  freeDeliveryFrom: number
  referralPercentBefore10: number
  referralPercentAfter10: number
}

const REFERRAL_MEMO = `Как работает реферальная система

Пользователь получает реферальную ссылку и делится ею. Новые пользователи, перешедшие по ссылке, привязываются к нему как рефералы.

За каждый подтверждённый заказ реферала реферер получает бонус на реф. баланс. Подтверждение заказа = смена статуса заказа на «Подтверждён» в разделе Заказы. Бонус начисляется автоматически один раз при этом переходе.

Процент бонуса зависит от количества уже подтверждённых заказов всех рефералов этого реферера:
  — до 10 заказов (включительно) — используется процент «До 10 заказов»;
  — с 11-го заказа — используется процент «После 10 заказов».

Сумма бонуса = (сумма заказа в рублях × процент) / 100, округление до целых рублей.

Реф. баланс и то, кто кого привёл, видны в разделе Пользователи (колонки «Привёл» и «Реф. баланс»).`

export default function ReferralPage({ onNavigate }: { onNavigate?: (page: AdminPage) => void }) {
  const [settings, setSettings] = useState<OrdersSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [referralBefore10, setReferralBefore10] = useState<string>('3')
  const [referralAfter10, setReferralAfter10] = useState<string>('5')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getOrdersSettings() as OrdersSettings
      setSettings(data)
      setReferralBefore10(String(data.referralPercentBefore10 ?? 3))
      setReferralAfter10(String(data.referralPercentAfter10 ?? 5))
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка загрузки настроек', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    const before = Number(referralBefore10)
    const after = Number(referralAfter10)
    if (!Number.isFinite(before) || before < 0 || !Number.isFinite(after) || after < 0) {
      setToast({ message: 'Укажите неотрицательные числа для процентов', type: 'error' })
      return
    }
    setSaving(true)
    try {
      await api.putOrdersSettings({
        deliveryFee: settings?.deliveryFee ?? 300,
        freeDeliveryFrom: settings?.freeDeliveryFrom ?? 3500,
        referralPercentBefore10: before,
        referralPercentAfter10: after
      })
      setSettings((prev) => prev ? { ...prev, referralPercentBefore10: before, referralPercentAfter10: after } : null)
      setToast({ message: 'Настройки сохранены', type: 'success' })
    } catch (e: any) {
      setToast({ message: e?.message || 'Ошибка сохранения', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - Никотиныч</h1>
        <AdminNav currentPage="referral" onNavigate={(p) => onNavigate?.(p)} />
        <button onClick={handleLogout} className="logout-btn">Выйти</button>
      </header>

      <div className="admin-content">
        {loading ? (
          <div className="empty-state"><p>Загрузка...</p></div>
        ) : (
          <>
            <section className="referral-settings-section">
              <h2 className="referral-section-title">Настройки процентов</h2>
              <div className="referral-form">
                <div className="form-group">
                  <label>Процент бонуса до 10 заказов рефералов (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={referralBefore10}
                    onChange={(e) => setReferralBefore10(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="form-group">
                  <label>Процент бонуса после 10 заказов рефералов (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={referralAfter10}
                    onChange={(e) => setReferralAfter10(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </section>

            <section className="referral-memo-section">
              <h2 className="referral-section-title">Памятка</h2>
              <pre className="referral-memo">{REFERRAL_MEMO}</pre>
            </section>
          </>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  )
}
