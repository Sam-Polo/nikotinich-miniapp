import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './logger.js'

// корень backend (admin/backend) — для разрешения относительных путей из .env независимо от cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '..')

export type SheetProduct = {
  id?: string
  slug: string
  title: string
  description?: string
  category: string // первая категория (для совместимости)
  categories: string[] // все категории товара
  price_rub: number
  discount_price_rub?: number // цена со скидкой (если заполнена - используется вместо price_rub)
  images: string[]
  active: boolean
  stock?: number
  article?: string
  brand?: string
  line?: string
  strength?: string // легкая | средняя | крепкая
  image_keys?: string[]
  /** порядок товара в каждом листе (ключ — имя категории, значение — индекс строки) */
  orderInCategory?: Record<string, number>
  // вариативные товары (семейства, вкусы, количество затяжек)
  familyKey?: string
  flavor?: string
  puffs?: number
}

// получение авторизации для Google Sheets (с правами на чтение и запись)
function getAuthFromEnv() {
  const filePath = process.env.GOOGLE_SA_FILE
  const raw = process.env.GOOGLE_SA_JSON
  let creds: any
  
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(BACKEND_ROOT, filePath)
    const txt = fs.readFileSync(resolved, 'utf8')
    creds = JSON.parse(txt)
  } else if (raw) {
    creds = JSON.parse(raw)
  } else {
    throw new Error('GOOGLE_SA_JSON or GOOGLE_SA_FILE is required')
  }
  
  // права на чтение и запись (изменено с readonly)
  const scopes = ['https://www.googleapis.com/auth/spreadsheets']
  return new google.auth.JWT(creds.client_email, undefined, creds.private_key, scopes)
}

// чтение одного листа
async function fetchSheetRange(
  auth: any, 
  sheetId: string, 
  range: string, 
  categoryName: string
): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
  const rows = res.data.values ?? []
  
  if (rows.length === 0) return []
  
  const header = rows[0].map((h: string) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const out: SheetProduct[] = []
  
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue
    
    const get = (n: string) => r[idx(n)] ?? ''
    const price = Number(String(get('price_rub')).replace(',', '.'))
    const discountPriceRaw = String(get('discount_price_rub') || '').trim()
    const discountPrice = discountPriceRaw ? Number(discountPriceRaw.replace(',', '.')) : undefined

    // парсим изображения: разделители - запятая или перенос строки
    const imagesRaw = String(get('images'))
    const images: string[] = imagesRaw
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean)
    const imageKeysRaw = String(get('image_keys'))
    const imageKeys: string[] = imageKeysRaw
      .split(/[\n]/)
      .map(s => s.trim())
      .filter(Boolean)
    
    const activeVal = String(get('active')).toLowerCase()
    const active = activeVal === 'true' || activeVal === '1' || activeVal === 'yes'
    const stock = Number(get('stock'))
    // артикул: в таблице хранится как число без ведущих нулей (100, 1) — нормализуем к "0100", "0001"
    const articleRaw = get('article')
    const articleStr = String(articleRaw ?? '').trim()
    const articleNum = articleStr ? parseInt(articleStr, 10) : NaN
    const article =
      articleStr && Number.isFinite(articleNum) && articleNum >= 0 && articleNum <= 9999
        ? String(articleNum).padStart(4, '0')
        : (articleStr || undefined)

    const familyKeyRaw = String(get('family_key') || '').trim()
    const flavorRaw = String(get('flavor') || '').trim()
    const puffsRaw = String(get('puffs') || '').replace(/\s/g, '')
    const puffsVal = puffsRaw ? Number(puffsRaw) : NaN

    const item: SheetProduct = {
      id: String(get('id') || '').trim() || undefined,
      slug: String(get('slug')).trim(),
      title: String(get('title')).trim(),
      description: String(get('description') || '').trim() || undefined,
      category: categoryName,
      categories: [categoryName],
      price_rub: Number.isFinite(price) ? price : 0,
      discount_price_rub: discountPrice && Number.isFinite(discountPrice) ? discountPrice : undefined,
      images,
      active,
      stock: Number.isFinite(stock) ? stock : undefined,
      article: article || undefined,
      brand: String(get('brand') || '').trim() || undefined,
      line: String(get('line') || '').trim() || undefined,
      strength: String(get('strength') || '').trim() || undefined,
      image_keys: imageKeys.length > 0 ? imageKeys : undefined,
      familyKey: familyKeyRaw || undefined,
      flavor: flavorRaw || undefined,
      puffs: Number.isFinite(puffsVal) ? puffsVal : undefined
    }
    
    if (!item.title || !item.slug) continue
    item.orderInCategory = { [categoryName]: i }
    out.push(item)
  }

  return out
}

// получение имён листов таблицы из API (кроме служебного "categories")
async function fetchSheetNamesFromSpreadsheet(auth: any, sheetId: string): Promise<string[]> {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties.title' })
  const names = (res.data.sheets ?? [])
    .map((s: any) => s.properties?.title)
    .filter(Boolean)
    .filter((title: string) => title !== 'categories')
  return names
}

// чтение всех товаров из Google Sheets (листы: из categories, или SHEET_NAMES, или все листы таблицы кроме categories)
export async function fetchProductsFromSheet(sheetId: string): Promise<SheetProduct[]> {
  const auth = getAuthFromEnv()
  
  const { fetchCategoriesFromSheet } = await import('./categories-utils.js')
  const categories = await fetchCategoriesFromSheet(sheetId)
  let sheetNames: string[]
  if (categories.length > 0) {
    sheetNames = categories.map((c) => c.key)
  } else if (process.env.SHEET_NAMES?.trim()) {
    sheetNames = process.env.SHEET_NAMES.split(',').map((s) => s.trim()).filter(Boolean)
  } else {
    sheetNames = await fetchSheetNamesFromSpreadsheet(auth, sheetId)
  }
  
  const bySlug = new Map<string, SheetProduct & { __minOrder?: number }>()
  
  for (const sheetName of sheetNames) {
    try {
      const range = `${sheetName.trim()}!A1:Q1000`
      const products = await fetchSheetRange(auth, sheetId, range, sheetName.trim())
      const sheetKey = sheetName.trim()
      for (const p of products) {
        const orderHere = p.orderInCategory?.[sheetKey] ?? 999999
        const existing = bySlug.get(p.slug)
        if (existing) {
          if (!existing.categories.includes(sheetKey)) {
            existing.categories.push(sheetKey)
          }
          if (!existing.orderInCategory) existing.orderInCategory = {}
          existing.orderInCategory[sheetKey] = orderHere
          // каноническая строка — та, где товар идёт раньше всего (минимальный индекс по всем листам)
          if (orderHere < (existing.__minOrder ?? 999999)) {
            existing.__minOrder = orderHere
            existing.title = p.title
            existing.description = p.description
            existing.price_rub = p.price_rub
            existing.discount_price_rub = p.discount_price_rub
            existing.images = p.images
            existing.active = p.active
            existing.stock = p.stock
            existing.article = p.article
            existing.id = p.id
            existing.familyKey = p.familyKey ?? existing.familyKey
            existing.flavor = p.flavor ?? existing.flavor
            existing.puffs = p.puffs ?? existing.puffs
          }
        } else {
          const merged: SheetProduct & { __minOrder?: number } = {
            ...p,
            categories: [sheetKey],
            orderInCategory: { [sheetKey]: orderHere },
            __minOrder: orderHere
          }
          bySlug.set(p.slug, merged)
        }
      }
    } catch (e: any) {
      logger.warn({ sheetName, error: e?.message }, 'не удалось прочитать лист')
    }
  }
  
  const result = Array.from(bySlug.values()).map((prod) => {
    const { __minOrder, ...rest } = prod
    return rest as SheetProduct
  })
  return result
}

