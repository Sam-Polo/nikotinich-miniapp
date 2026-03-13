import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useUserStore } from '../store/user'
import { createOrder, validatePromo } from '../api'
import PageHeader from '../components/PageHeader'
import BottomSheet from '../components/BottomSheet'

function formatRub(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function formatPhone(value: string) {
  const digits = normalizePhone(value)
  if (!digits) return ''

  let d = digits
  // приводим к формату, начинающемуся с 7
  if (d[0] === '8') {
    d = '7' + d.slice(1)
  } else if (d[0] !== '7') {
    d = '7' + d.slice(1)
  }

  let result = '+7'
  if (d.length > 1) {
    result += ' ' + d.slice(1, Math.min(4, d.length))
  }
  if (d.length > 4) {
    result += ' ' + d.slice(4, Math.min(7, d.length))
  }
  if (d.length > 7) {
    result += '-' + d.slice(7, Math.min(9, d.length))
  }
  if (d.length > 9) {
    result += '-' + d.slice(9, Math.min(11, d.length))
  }
  return result
}

function validateFullName(value: string) {
  const safe = value.trim()
  if (!safe) return 'Укажите ФИО'
  if (!/^[A-Za-zА-Яа-яЁё\s-]+$/.test(safe)) return 'Используйте только буквы'
  if (safe.split(/\s+/).length < 2) return 'Укажите имя и фамилию'
  if (safe.length < 5) return 'Слишком короткое ФИО'
  return ''
}

function validateEmail(value: string) {
  const safe = value.trim()
  if (!safe) return 'Укажите email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) return 'Некорректный email'
  return ''
}

function validatePhone(value: string) {
  const digits = normalizePhone(value)
  if (!digits) return 'Укажите телефон'
  if (digits.length !== 11) return 'Телефон должен быть из 11 цифр'
  if (digits[0] !== '7' && digits[0] !== '8') return 'Телефон должен начинаться с 7 или 8'
  return ''
}

function validateAddress(value: string) {
  if (!value.trim()) return 'Укажите адрес доставки'
  if (value.trim().length < 6) return 'Адрес слишком короткий'
  return ''
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart, promoApplied, referralBonusUsed, applyPromo, clearPromo } = useCartStore()
  const { user, settings } = useUserStore()

  const [name, setName] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState('')

  const [sheetDataOpen, setSheetDataOpen] = useState(false)
  const [sheetAddressOpen, setSheetAddressOpen] = useState(false)
  const [sheetCommentOpen, setSheetCommentOpen] = useState(false)

  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftComment, setDraftComment] = useState('')

  const [draftNameError, setDraftNameError] = useState('')
  const [draftEmailError, setDraftEmailError] = useState('')
  const [draftPhoneError, setDraftPhoneError] = useState('')
  const [draftAddressError, setDraftAddressError] = useState('')
  const [draftCommentError, setDraftCommentError] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receiverError, setReceiverError] = useState('')
  const [addressSummaryError, setAddressSummaryError] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [comment, setComment] = useState('')

  const deliveryFee = settings?.deliveryFee ?? 300
  const freeFrom = settings?.freeDeliveryFrom ?? 3500
  const sub = subtotal()
  const isFree = sub >= freeFrom
  const delivery = isFree ? 0 : deliveryFee
  const totalBeforeDiscount = sub + delivery
  const promoDiscount = promoApplied?.discount ?? 0
  const afterPromo = Math.max(0, totalBeforeDiscount - promoDiscount)
  const effectiveBonus = Math.min(referralBonusUsed, afterPromo)
  const total = Math.max(0, afterPromo - effectiveBonus)

  const receiverMeta = useMemo(() => {
    const phoneText = phone.trim() ? formatPhone(phone.trim()) : ''
    const parts = [email.trim(), phoneText].filter(Boolean)
    if (parts.length <= 1) return parts.join('')
    const gap = '\u00A0\u00A0\u00A0'
    return parts.join(gap)
  }, [email, phone])

  useEffect(() => {
    if (!user) return
    setName(prev => prev || user.username || '')
    setEmail(prev => prev || user.email || '')
    setPhone(prev => prev || user.phone || '')
  }, [user])

  function openDataSheet() {
    setDraftName(name)
    setDraftEmail(email)
    setDraftPhone(phone)
    setDraftNameError('')
    setDraftEmailError('')
    setDraftPhoneError('')
    setSheetDataOpen(true)
  }

  function openAddressSheet() {
    setDraftAddress(address)
    setDraftAddressError('')
    setSheetAddressOpen(true)
  }

  function openCommentSheet() {
    setDraftComment(comment)
    setDraftCommentError('')
    setSheetCommentOpen(true)
  }

  function saveReceiverData() {
    const nextNameError = validateFullName(draftName)
    const nextEmailError = validateEmail(draftEmail)
    const nextPhoneError = validatePhone(draftPhone)
    setDraftNameError(nextNameError)
    setDraftEmailError(nextEmailError)
    setDraftPhoneError(nextPhoneError)
    if (nextNameError || nextEmailError || nextPhoneError) return

    setName(draftName.trim())
    setEmail(draftEmail.trim())
    setPhone(formatPhone(draftPhone.trim()))
    setSheetDataOpen(false)
  }

  function saveAddressData() {
    const nextAddressError = validateAddress(draftAddress)
    setDraftAddressError(nextAddressError)
    if (nextAddressError) return
    setAddress(draftAddress.trim())
    setSheetAddressOpen(false)
  }

  function saveCommentData() {
    // комментарий не обязателен, просто сохраняем
    setComment(draftComment.trim())
    setSheetCommentOpen(false)
  }

  async function handleSubmit() {
    const nameError = validateFullName(name)
    const emailError = validateEmail(email)
    const phoneError = validatePhone(phone)
    const addressError = validateAddress(address)
    if (nameError || emailError || phoneError || addressError) {
      setReceiverError(nameError || emailError || phoneError || '')
      setAddressSummaryError(addressError || '')
      return
    }

    setReceiverError('')
    setAddressSummaryError('')
    setError('')
    setLoading(true)
    try {
      const orderItems = items.map(i => ({
        slug: i.product.slug,
        qty: i.qty,
        title: i.product.title,
        priceRub: i.product.display_price,
        article: i.product.article
      }))

      const result = await createOrder({
        customerName: name.trim(),
        items: orderItems,
        userId: user?.telegram_id,
        phone: formatPhone(phone.trim()),
        address: address.trim() || undefined,
        totalRub: total,
        deliveryFee: delivery,
        promoCode: promoApplied?.code || undefined,
        // email и комментарий не изменяют профиль, а уходят в заказ в заметке для менеджера
        note: comment.trim() || undefined,
        referralBonusUsed: effectiveBonus > 0 ? effectiveBonus : undefined
      })

      clearCart()
      navigate(`/order-success/${result.id}`)
    } catch {
      setError('Не удалось оформить заказ. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-bg-base">
      <PageHeader title="Никотиныч" subtitle="mini app" showBack />

      <div className="flex-1 px-4 pt-4 pb-[190px] overflow-y-auto">
        <section className="space-y-6">
          <div>
            <h2 className="text-[20px] font-bold leading-[120%] text-[#343434] mb-3">Получатель</h2>
            <button
              type="button"
              onClick={openDataSheet}
              className="w-full h-[56px] flex items-center gap-2.5 py-3 text-left"
            >
              <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.75 4.75C11.75 5.81087 11.3286 6.82828 10.5784 7.57843C9.82828 8.32857 8.81087 8.75 7.75 8.75C6.68913 8.75 5.67172 8.32857 4.92157 7.57843C4.17143 6.82828 3.75 5.81087 3.75 4.75C3.75 3.68913 4.17143 2.67172 4.92157 1.92157C5.67172 1.17143 6.68913 0.75 7.75 0.75C8.81087 0.75 9.82828 1.17143 10.5784 1.92157C11.3286 2.67172 11.75 3.68913 11.75 4.75ZM7.75 11.75C5.89348 11.75 4.11301 12.4875 2.80025 13.8003C1.4875 15.113 0.75 16.8935 0.75 18.75H14.75C14.75 16.8935 14.0125 15.113 12.6997 13.8003C11.387 12.4875 9.60652 11.75 7.75 11.75Z" stroke="#434343" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold leading-[110%] text-[#434343] truncate">
                  {name || 'Укажите ФИО'}
                </span>
                <span className="block text-[12px] font-normal leading-[110%] text-[#797979] truncate mt-0.5">
                  {receiverMeta || 'Укажите email и телефон'}
                </span>
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#1C1C1E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {receiverError && (
              <p className="text-destructive text-[14px] px-1 mt-1">{receiverError}</p>
            )}
          </div>

          <div>
            <p className="text-[12px] font-bold leading-[120%] text-[#434343] px-1 mb-2">Адрес доставки</p>
            <button
              type="button"
              onClick={openAddressSheet}
              className="w-full h-[44px] rounded-[12px] bg-[#F8F8F8] px-3 flex items-center justify-between gap-3"
            >
              <span className={`text-[16px] font-normal leading-[19px] truncate ${address ? 'text-[#434343]' : 'text-[#9FA2AA]'}`}>
                {address || 'Укажите адрес'}
              </span>
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.20565 2.98391L12.3168 6.09488M1.25825 11.0024L0.650024 14.65L4.29783 14.0418C4.93157 13.9366 5.51653 13.6358 5.97084 13.1817L14.199 4.95315C14.4878 4.66437 14.65 4.2727 14.65 3.86432C14.65 3.45593 14.4878 3.06427 14.199 2.77548L12.526 1.10178C12.383 0.958569 12.2131 0.844956 12.0261 0.76744C11.8392 0.689924 11.6387 0.650024 11.4363 0.650024C11.2339 0.650024 11.0335 0.689924 10.8465 0.76744C10.6595 0.844956 10.4897 0.958569 10.3467 1.10178L2.11848 9.33028C1.66442 9.78436 1.36366 10.369 1.25825 11.0024Z" stroke="black" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {addressSummaryError && (
              <p className="text-destructive text-[14px] px-1 mt-1">{addressSummaryError}</p>
            )}
          </div>

          <div>
            <p className="text-[12px] font-bold leading-[120%] text-[#434343] px-1 mb-2">Комментарий к заказу</p>
            <button
              type="button"
              onClick={openCommentSheet}
              className="w-full h-[44px] rounded-[12px] bg-[#F8F8F8] px-3 flex items-center justify-between gap-3"
            >
              <span className={`text-[16px] font-normal leading-[19px] truncate ${comment ? 'text-[#434343]' : 'text-[#9FA2AA]'}`}>
                {comment || 'Добавьте комментарий для курьера'}
              </span>
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.20565 2.98391L12.3168 6.09488M1.25825 11.0024L0.650024 14.65L4.29783 14.0418C4.93157 13.9366 5.51653 13.6358 5.97084 13.1817L14.199 4.95315C14.4878 4.66437 14.65 4.2727 14.65 3.86432C14.65 3.45593 14.4878 3.06427 14.199 2.77548L12.526 1.10178C12.383 0.958569 12.2131 0.844956 12.0261 0.76744C11.8392 0.689924 11.6387 0.650024 11.4363 0.650024C11.2339 0.650024 11.0335 0.689924 10.8465 0.76744C10.6595 0.844956 10.4897 0.958569 10.3467 1.10178L2.11848 9.33028C1.66442 9.78436 1.36366 10.369 1.25825 11.0024Z" stroke="black" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>

          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value); setPromoError('') }}
                placeholder="PROMO"
                className="w-1/2 h-[44px] rounded-[12px] px-4 text-[16px] font-medium leading-[120%] text-[#626262] bg-white border border-[#E5E5EA] outline-none focus:border-[#8E8E93] transition-colors duration-150"
              />
              <button
                type="button"
                disabled={promoLoading || !promoInput.trim()}
                onClick={async () => {
                  const code = promoInput.trim().toUpperCase()
                  if (!code) return
                  setPromoLoading(true)
                  setPromoError('')
                  try {
                    const slugs = items.map(i => i.product.slug)
                    const res = await validatePromo(code, totalBeforeDiscount, slugs)
                    if (!res.valid || res.discount <= 0) {
                      clearPromo()
                      setPromoError('Промокод не даёт скидки для этой корзины')
                    } else {
                      applyPromo({ code, discount: res.discount, productSlugs: res.productSlugs })
                    }
                  } catch (e: any) {
                    clearPromo()
                    if (e?.message === 'invalid_code') {
                      setPromoError('Промокод не найден или больше не действует')
                    } else {
                      setPromoError(e?.message || 'Не удалось применить промокод')
                    }
                  } finally {
                    setPromoLoading(false)
                  }
                }}
                className="h-[44px] px-1 text-[#0099FF] flex items-center justify-center active:opacity-90 disabled:opacity-50 flex-shrink-0"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {promoApplied && !promoError && (
              <p className="text-[13px] text-[#34C759] px-1 mt-1">
                Скидка по промокоду: −{formatRub(promoDiscount)}
              </p>
            )}
            {promoError && (
              <p className="text-[13px] text-[#FF3B30] px-1 mt-1">{promoError}</p>
            )}
          </div>

          <section className="rounded-[18px] bg-[#F8F8F8] p-[18px] space-y-4">
            <div className="space-y-[10px]">
              {items.map((item) => (
                <div key={item.product.slug} className="flex items-center gap-[10px] h-[50px]">
                  <div className="w-[50px] h-[50px] rounded-[8px] bg-[#E7E7E7] overflow-hidden flex-shrink-0">
                    {item.product.images[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        className="w-full h-full object-contain p-1 mix-blend-multiply"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 h-[50px] flex flex-col justify-between">
                    <p className="text-[12px] font-medium leading-[110%] text-[#626262] line-clamp-2">
                      {item.product.title}
                    </p>
                    <p className="text-[15px] font-bold leading-[110%] text-[#434343]">
                      {formatRub(item.product.display_price * item.qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start justify-between gap-2 mt-2">
              <span className="text-[13px] font-normal leading-[120%] text-[#626262]">
                Доставка
              </span>
              <span className="text-[13px] font-normal leading-[120%] text-[#626262]">
                {isFree ? '0 ₽' : formatRub(delivery)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-1 mt-1">
              <span className="text-[14px] font-semibold leading-[120%] text-[#434343]">Итого</span>
              <span className="text-[18px] font-bold leading-[110%] text-[#434343]">{formatRub(total)}</span>
            </div>
          </section>

          {error && <p className="text-destructive text-[14px]">{error}</p>}
        </section>
      </div>

      <div className="fixed left-0 right-0 px-4 z-[60]" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 6px)' }}>
        <button
          type="button"
          disabled={loading}
          className="w-full h-[55px] rounded-[18px] bg-[#0099FF] px-[15px] flex items-center justify-between active:opacity-90 disabled:opacity-50"
          onClick={handleSubmit}
        >
          <span className="text-[16px] font-semibold leading-[19px] text-white">Сформировать заказ</span>
          <span className="text-[14px] font-semibold leading-[17px] text-white opacity-80">{formatRub(total)}</span>
        </button>
      </div>

      <BottomSheet open={sheetDataOpen} onClose={() => setSheetDataOpen(false)} snapHeight="78vh">
        <div className="bg-white">
          <div className="h-11 flex items-center justify-between px-4">
            <span className="w-14" />
            <h3 className="text-[17px] font-semibold leading-[22px] tracking-[-0.4px] text-[#343434]">Данные получателя</h3>
            <button type="button" className="text-[17px] font-normal leading-[22px] tracking-[-0.4px] text-[#00AAFF]" onClick={() => setSheetDataOpen(false)}>
              Готово
            </button>
          </div>
          <div className="px-[14px] pt-4 pb-5 space-y-2">
            <InputField
              value={draftName}
              onChange={(v) => { setDraftName(v); setDraftNameError('') }}
              placeholder="Фамилия Имя Отчество"
              error={draftNameError}
            />
            <InputField
              value={draftEmail}
              onChange={(v) => { setDraftEmail(v); setDraftEmailError('') }}
              placeholder="Электронная почта"
              error={draftEmailError}
            />
            <InputField
              value={draftPhone}
              onChange={(v) => { setDraftPhone(v); setDraftPhoneError('') }}
              placeholder="Телефон"
              error={draftPhoneError}
            />
            <button
              type="button"
              onClick={saveReceiverData}
              className="mt-[18px] w-full h-[55px] rounded-[18px] bg-[#0099FF] text-white font-semibold active:opacity-90"
            >
              <span className="text-[16px] leading-[19px]">Сохранить</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheetAddressOpen} onClose={() => setSheetAddressOpen(false)} snapHeight="78vh">
        <div className="bg-white">
          <div className="h-11 flex items-center justify-between px-4">
            <span className="w-14" />
            <h3 className="text-[17px] font-semibold leading-[22px] tracking-[-0.4px] text-[#343434]">Адрес доставки</h3>
            <button type="button" className="text-[17px] font-normal leading-[22px] tracking-[-0.4px] text-[#00AAFF]" onClick={() => setSheetAddressOpen(false)}>
              Готово
            </button>
          </div>
          <div className="px-[14px] pt-4 pb-5 space-y-2">
            <InputField
              value={draftAddress}
              onChange={(v) => { setDraftAddress(v); setDraftAddressError('') }}
              placeholder="Москва, Окская улица, 4"
              error={draftAddressError}
            />
            <button
              type="button"
              onClick={saveAddressData}
              className="mt-[18px] w-full h-[55px] rounded-[18px] bg-[#0099FF] text-white text-[16px] font-semibold leading-[19px] active:opacity-90"
            >
              Сохранить
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheetCommentOpen} onClose={() => setSheetCommentOpen(false)} snapHeight="60vh">
        <div className="bg-white">
          <div className="h-11 flex items-center justify-between px-4">
            <span className="w-14" />
            <h3 className="text-[17px] font-semibold leading-[22px] tracking-[-0.4px] text-[#343434]">Комментарий к заказу</h3>
            <button type="button" className="text-[17px] font-normal leading-[22px] tracking-[-0.4px] text-[#00AAFF]" onClick={() => setSheetCommentOpen(false)}>
              Готово
            </button>
          </div>
          <div className="px-[14px] pt-4 pb-5 space-y-2">
            <InputField
              value={draftComment}
              onChange={(v) => { setDraftComment(v); setDraftCommentError('') }}
              placeholder=""
              error={draftCommentError}
            />
            <button
              type="button"
              onClick={saveCommentData}
              className="mt-[18px] w-full h-[55px] rounded-[18px] bg-[#0099FF] text-white text-[16px] font-semibold leading-[19px] active:opacity-90"
            >
              Сохранить
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

function InputField({
  value,
  onChange,
  placeholder,
  error
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  error: string
}) {
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-[51px] rounded-[12px] px-4 text-[16px] font-medium leading-[120%] text-[#343434] bg-[#F8F8F8] border outline-none ${error ? 'border-[#FF3B30]' : 'border-transparent focus:border-[#000000]'}`}
      />
      {error && <p className="text-[13px] text-[#FF3B30]">{error}</p>}
    </div>
  )
}
