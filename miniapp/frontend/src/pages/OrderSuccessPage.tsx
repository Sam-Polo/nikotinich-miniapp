import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full bg-bg-base items-center justify-center px-6 pt-16 text-center pb-24">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="text-[24px] font-bold text-text-primary mb-2">Заказ оформлен!</h1>
      <p className="text-text-secondary text-[16px] mb-2">Ваш заказ принят в обработку</p>
      {orderId && (
        <p className="text-text-secondary text-[13px] mb-6 font-mono bg-bg-base px-3 py-1.5 rounded-lg">
          #{orderId.slice(0, 8).toUpperCase()}
        </p>
      )}
      <p className="text-text-secondary text-[14px] mb-8 leading-relaxed">
        Мы свяжемся с вами для подтверждения. Следить за статусом заказа можно в разделе «Профиль».
      </p>

      <Button fullWidth onClick={() => navigate('/')}>
        На главную
      </Button>
      <Button variant="ghost" fullWidth className="mt-3" onClick={() => navigate('/profile')}>
        Мои заказы
      </Button>
    </div>
  )
}
