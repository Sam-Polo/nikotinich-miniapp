// базовый URL API: в dev — проксируется через vite, в prod — env-переменная
const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// --- типы ---

export type Category = { key: string; title: string; image: string }
export type Brand = { category_key: string; key: string; title: string; image: string }
export type Line = { brand_key: string; key: string; title: string; image: string }

export type Product = {
  slug: string
  title: string
  description?: string
  category: string
  price_rub: number
  display_price: number
  discount_price_rub?: number
  images: string[]
  brand?: string
  line?: string
  strength?: string
  article?: string
  stock?: number
}

export type ContentItem = {
  id: string
  type: 'news' | 'collection'
  title: string
  body?: string
  imageUrl?: string
  publishedAt?: string
  sort: number
  productSlugs: string[]
}

export type AppSettings = {
  deliveryFee: number
  freeDeliveryFrom: number
  referralPercentBefore10: number
  referralPercentAfter10: number
}

export type OrderItem = { slug: string; qty: number; title?: string; priceRub?: number }

export type Order = {
  id: string
  userId?: string
  customerName: string
  phone?: string
  address?: string
  items: OrderItem[]
  totalRub: number
  promoCode?: string
  deliveryFee: number
  status: string
  createdAt: string
  confirmedAt?: string
  note?: string
}

export type User = {
  telegram_id: string
  username: string
  email: string
  phone: string
  role: string
  active: boolean
  referrer_id?: string
  referral_balance_rub: number
}

export type PromoValidation = {
  valid: boolean
  type: 'amount' | 'percent'
  value: number
  discount: number
  productSlugs: string[]
}

// --- каталог ---

export const getCategories = () => request<Category[]>('/catalog/categories')
export const getBrands = (category_key: string) =>
  request<Brand[]>(`/catalog/brands?category_key=${encodeURIComponent(category_key)}`)
export const getLines = (brand_key: string) =>
  request<Line[]>(`/catalog/lines?brand_key=${encodeURIComponent(brand_key)}`)
export const getProducts = (params: { category?: string; brand?: string; line?: string; search?: string } = {}) => {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.brand) qs.set('brand', params.brand)
  if (params.line) qs.set('line', params.line)
  if (params.search) qs.set('search', params.search)
  return request<Product[]>(`/catalog/products?${qs}`)
}
export const getProduct = (slug: string) => request<Product>(`/catalog/products/${encodeURIComponent(slug)}`)

// --- контент ---

export const getContent = () => request<ContentItem[]>('/content')

// --- настройки ---

export const getSettings = () => request<AppSettings>('/settings')

// --- заказы ---

export const getUserOrders = (userId: string) =>
  request<Order[]>(`/orders?userId=${encodeURIComponent(userId)}`)

export const createOrder = (data: {
  customerName: string
  items: OrderItem[]
  userId?: string
  phone?: string
  address?: string
  totalRub?: number
  deliveryFee?: number
  promoCode?: string
  note?: string
}) => request<{ id: string; status: string; createdAt: string }>('/orders', {
  method: 'POST',
  body: JSON.stringify(data)
})

// --- пользователи ---

export const getUser = (telegram_id: string) =>
  request<User>(`/users/${encodeURIComponent(telegram_id)}`)

export const upsertUser = (data: {
  telegram_id: string
  username?: string
  email?: string
  phone?: string
  referrer_id?: string
}) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) })

export const updateUser = (telegram_id: string, data: { email?: string; phone?: string; username?: string }) =>
  request<User>(`/users/${encodeURIComponent(telegram_id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })

// --- посещения ---

export const trackVisit = (userId?: string) =>
  request<{ ok: boolean }>('/visits', { method: 'POST', body: JSON.stringify({ userId }) })

// --- промокоды ---

export const validatePromo = (code: string, totalRub: number) =>
  request<PromoValidation>(`/promocodes/validate?code=${encodeURIComponent(code)}&totalRub=${totalRub}`)
