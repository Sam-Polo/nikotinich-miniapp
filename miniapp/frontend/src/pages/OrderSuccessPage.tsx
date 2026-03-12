import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full bg-bg-base items-center justify-center px-6 pt-16 text-center pb-24 overflow-hidden">
      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full bg-[#0099FF]/25 animate-ping" />
        <div className="relative w-20 h-20 bg-[#E8F4FF] rounded-full flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#0099FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <h1 className="text-[26px] font-bold text-[#343434] mb-2">Заказ создан</h1>
      <p className="text-[#595959] text-[16px] mb-2">Менеджер обработает его в ближайшее время</p>
      {orderId && (
        <p className="text-[#797979] text-[13px] mb-6 font-mono bg-white px-3 py-1.5 rounded-lg border border-[#EDEDED]">
          #{orderId.slice(0, 8).toUpperCase()}
        </p>
      )}
      <p className="text-[#797979] text-[14px] mb-8 leading-relaxed">
        Заказ можно посмотреть в истории заказов в разделе «Профиль».
      </p>

      <button
        type="button"
        className="w-full max-w-[361px] h-[55px] rounded-[18px] bg-[#0099FF] text-white text-[16px] font-semibold active:opacity-90"
        onClick={() => navigate('/profile')}
      >
        В профиль
      </button>
      <Button variant="ghost" fullWidth className="mt-3 max-w-[361px]" onClick={() => navigate('/')}>
        Вернуться в каталог
      </Button>
    </div>
  )
}
