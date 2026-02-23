const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001'

// сохранение токена в localStorage
export function saveToken(token: string) {
  localStorage.setItem('admin_token', token)
}

// получение токена из localStorage
export function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

// удаление токена
export function removeToken() {
  localStorage.removeItem('admin_token')
}

// базовый fetch с авторизацией
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = new Headers(options.headers)
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers
  })
  
  if (response.status === 401) {
    removeToken()
    window.location.href = '/'
    throw new Error('unauthorized')
  }
  
  if (!response.ok) {
    let errorMessage = 'request_failed'
    try {
      const error = await response.json()
      errorMessage = error.error || error.message || 'request_failed'
    } catch {
      // если не удалось распарсить JSON, пробуем получить текст
      try {
        const text = await response.text()
        errorMessage = text || `Ошибка ${response.status}: ${response.statusText}`
      } catch {
        errorMessage = `Ошибка ${response.status}: ${response.statusText}`
      }
    }
    
    // переводим коды ошибок в понятные сообщения
    const errorMessages: Record<string, string> = {
      'missing_required_fields': 'Заполните все обязательные поля',
      'invalid_price': 'Некорректная цена',
      'invalid_discount_price': 'Некорректная цена со скидкой',
      'discount_price_must_be_less': 'Цена со скидкой должна быть меньше обычной цены',
      'images_required': 'Добавьте хотя бы одно фото',
      'article_already_exists': 'Артикул уже существует',
      'slug_already_exists': 'Slug уже существует',
      'invalid_category': 'Некорректная категория',
      'invalid_strength': 'Крепость: выберите легкая, средняя или крепкая',
      'product_not_found': 'Товар не найден',
      'product_not_in_category': 'Товар не найден в указанной категории',
      'file_too_large': 'Файл слишком большой (максимум 10 МБ)',
      'failed_to_create_product': 'Ошибка создания товара',
      'failed_to_update_product': 'Ошибка обновления товара',
      'failed_to_delete_product': 'Ошибка удаления товара',
      'GOOGLE_SHEET_ID not configured': 'GOOGLE_SHEET_ID не настроен',
      'missing_telegram_id': 'Укажите Telegram ID',
      'telegram_id_already_exists': 'Пользователь с таким Telegram ID уже есть',
      'user_not_found': 'Пользователь не найден',
    }
    
    throw new Error(errorMessages[errorMessage] || errorMessage)
  }
  
  return response.json()
}

// API методы
export const api = {
  // авторизация
  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'login_failed' }))
      throw new Error(error.error || 'login_failed')
    }
    
    const data = await response.json()
    return data
  },
  
  // получение списка товаров; опционально search — фильтр по названию, артикулу, slug
  async getProducts(search?: string) {
    const url = search && search.trim()
      ? `/api/products?search=${encodeURIComponent(search.trim())}`
      : '/api/products'
    return fetchWithAuth(url)
  },

  // добавление товара
  async createProduct(product: any) {
    return fetchWithAuth('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    })
  },

  // обновление товара
  async updateProduct(slug: string, product: any) {
    return fetchWithAuth(`/api/products/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    })
  },

  // удаление товара (category — только из этой категории; без — из всех)
  async deleteProduct(slug: string, category?: string) {
    const url = category
      ? `/api/products/${encodeURIComponent(slug)}?category=${encodeURIComponent(category)}`
      : `/api/products/${slug}`
    return fetchWithAuth(url, {
      method: 'DELETE'
    })
  },

  // переупорядочивание товаров в категории
  async reorderProducts(category: string, slugs: string[]) {
    return fetchWithAuth('/api/products/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, slugs })
    })
  },

  // загрузка фото в media storage (таймаут 2 мин). options.square — обрезка до 1:1 по центру
  async uploadImage(file: File, options?: { square?: boolean }): Promise<{ url: string; key?: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const token = getToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000)

    const uploadUrl = options?.square ? `${API_URL}/api/upload?square=1` : `${API_URL}/api/upload`
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.status === 401) {
      removeToken()
      window.location.href = '/'
      throw new Error('unauthorized')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'upload_failed' }))
      throw new Error(error.error || 'upload_failed')
    }

    const data = await response.json()
    return { url: data.url, key: data.key }
  },

  // промокоды
  async getPromocodes() {
    return fetchWithAuth('/api/promocodes')
  },

  async createPromocode(promocode: any) {
    return fetchWithAuth('/api/promocodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promocode)
    })
  },

  async updatePromocode(code: string, promocode: any) {
    return fetchWithAuth(`/api/promocodes/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promocode)
    })
  },

  async deletePromocode(code: string) {
    return fetchWithAuth(`/api/promocodes/${code}`, {
      method: 'DELETE'
    })
  },

  // категории
  async getCategories() {
    return fetchWithAuth('/api/categories')
  },

  async saveCategories(categories: Array<{ key: string; title: string; image: string }>) {
    return fetchWithAuth('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories })
    })
  },

  // бренды и линейки
  async getBrands(categoryKey?: string) {
    const url = categoryKey
      ? `/api/brands?category_key=${encodeURIComponent(categoryKey)}`
      : '/api/brands'
    return fetchWithAuth(url)
  },
  async saveBrands(brands: Array<{ category_key: string; key: string; title: string; image: string }>) {
    return fetchWithAuth('/api/brands', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brands })
    })
  },
  async getLines(brandKey?: string) {
    const url = brandKey
      ? `/api/lines?brand_key=${encodeURIComponent(brandKey)}`
      : '/api/lines'
    return fetchWithAuth(url)
  },
  async saveLines(lines: Array<{ brand_key: string; key: string; title: string; image: string }>) {
    return fetchWithAuth('/api/lines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines })
    })
  },

  // пользователи миниаппа
  async getUsers() {
    return fetchWithAuth('/api/users')
  },
  async createUser(user: { telegram_id: string; username: string; email?: string; phone?: string; role: string; active: boolean }) {
    return fetchWithAuth('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    })
  },
  async updateUser(user: { telegram_id: string; username?: string; email?: string; phone?: string; role?: string; active?: boolean }) {
    return fetchWithAuth('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    })
  },
  async deleteUser(telegramId: string) {
    return fetchWithAuth(`/api/users?telegram_id=${encodeURIComponent(telegramId)}`, { method: 'DELETE' })
  },

  // лента контента (новости + подборки в одном порядке)
  async getContent() {
    return fetchWithAuth('/api/content')
  },
  async saveContent(items: any[]) {
    return fetchWithAuth('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
  },

  // заказы (пагинация: limit/offset, фильтры user_id, status)
  async getOrders(params?: { userId?: string; status?: string; limit?: number; offset?: number }) {
    const sp = new URLSearchParams()
    if (params?.userId) sp.set('user_id', params.userId)
    if (params?.status) sp.set('status', params.status)
    if (params?.limit != null) sp.set('limit', String(params.limit))
    if (params?.offset != null) sp.set('offset', String(params.offset))
    const q = sp.toString()
    return fetchWithAuth(q ? `/api/orders?${q}` : '/api/orders')
  },
  async createOrder(order: any) {
    return fetchWithAuth('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    })
  },
  async updateOrderStatus(id: string, status: string) {
    return fetchWithAuth(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  },

  // статистика посещений
  async getVisitsStats(period: '7d' | '30d' | 'all') {
    return fetchWithAuth(`/api/analytics/visits-stats?period=${period}`)
  },

  // настройки заказов (доставка + реферальные проценты)
  async getOrdersSettings() {
    return fetchWithAuth('/api/settings/orders-status')
  },
  async putOrdersSettings(settings: {
    deliveryFee?: number
    freeDeliveryFrom?: number
    referralPercentBefore10?: number
    referralPercentAfter10?: number
  }) {
    return fetchWithAuth('/api/settings/orders-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
  }
}

