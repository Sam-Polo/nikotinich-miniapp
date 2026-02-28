import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { readSheet, getSheetTitles } from '../sheets-utils.js'
import { logger } from '../logger.js'

const router = Router()

// GET /api/catalog/categories — список категорий
router.get('/categories', async (_req, res) => {
  try {
    const rows = await readSheet(SHEET_ID, 'categories!A1:D200')
    if (rows.length < 2) return res.json([])

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)

    const categories = rows.slice(1)
      .filter(r => r && r.length > 0)
      .map(r => ({
        key: String(r[idx('key')] || '').trim(),
        title: String(r[idx('title')] || '').trim(),
        image: String(r[idx('image')] || '').trim()
      }))
      .filter(c => c.key && c.title)

    res.json(categories)
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка чтения категорий')
    res.status(500).json({ error: 'server_error' })
  }
})

// GET /api/catalog/brands?category_key= — бренды по категории
router.get('/brands', async (req, res) => {
  const categoryKey = String(req.query.category_key || '').trim()
  try {
    const rows = await readSheet(SHEET_ID, 'brands!A1:E500')
    if (rows.length < 2) return res.json([])

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)

    let brands = rows.slice(1)
      .filter(r => r && r.length > 0)
      .map(r => ({
        category_key: String(r[idx('category_key')] || '').trim(),
        key: String(r[idx('key')] || '').trim(),
        title: String(r[idx('title')] || '').trim(),
        image: String(r[idx('image')] || '').trim()
      }))
      .filter(b => b.key && b.title)

    if (categoryKey) {
      brands = brands.filter(b => b.category_key === categoryKey)
    }

    res.json(brands)
  } catch (e: any) {
    logger.error({ error: e?.message, categoryKey }, 'ошибка чтения брендов')
    res.status(500).json({ error: 'server_error' })
  }
})

// GET /api/catalog/lines?brand_key= — линейки по бренду
router.get('/lines', async (req, res) => {
  const brandKey = String(req.query.brand_key || '').trim()
  try {
    const rows = await readSheet(SHEET_ID, 'lines!A1:E500')
    if (rows.length < 2) return res.json([])

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)

    let lines = rows.slice(1)
      .filter(r => r && r.length > 0)
      .map(r => ({
        brand_key: String(r[idx('brand_key')] || '').trim(),
        key: String(r[idx('key')] || '').trim(),
        title: String(r[idx('title')] || '').trim(),
        image: String(r[idx('image')] || '').trim()
      }))
      .filter(l => l.key && l.title)

    if (brandKey) {
      lines = lines.filter(l => l.brand_key === brandKey)
    }

    res.json(lines)
  } catch (e: any) {
    logger.error({ error: e?.message, brandKey }, 'ошибка чтения линеек')
    res.status(500).json({ error: 'server_error' })
  }
})

// разбор товаров из строк листа
function parseProductRows(rows: string[][], categoryName: string) {
  if (rows.length < 2) return []

  const header = rows[0].map((h: string) => h.trim().toLowerCase())
  const idx = (n: string) => header.indexOf(n)
  const products = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue

    const get = (n: string) => String(r[idx(n)] ?? '').trim()
    const activeVal = get('active').toLowerCase()
    const active = activeVal === 'true' || activeVal === '1' || activeVal === 'yes'
    if (!active) continue

    const slug = get('slug')
    const title = get('title')
    if (!slug || !title) continue

    const price = Number(get('price_rub').replace(',', '.'))
    const discountRaw = get('discount_price_rub')
    const discountPrice = discountRaw ? Number(discountRaw.replace(',', '.')) : undefined

    const imagesRaw = get('images')
    const images = imagesRaw.split(/[,\n]/).map(s => s.trim()).filter(Boolean)

    products.push({
      slug,
      title,
      description: get('description') || undefined,
      category: categoryName,
      price_rub: Number.isFinite(price) ? price : 0,
      display_price: (discountPrice && Number.isFinite(discountPrice)) ? discountPrice : (Number.isFinite(price) ? price : 0),
      discount_price_rub: (discountPrice && Number.isFinite(discountPrice)) ? discountPrice : undefined,
      images,
      brand: get('brand') || undefined,
      line: get('line') || undefined,
      strength: get('strength') || undefined,
      article: get('article') || undefined,
      stock: get('stock') ? Number(get('stock')) : undefined
    })
  }

  return products
}

// GET /api/catalog/products?category=&brand=&line=&search=&slugs= — товары с фильтрами
router.get('/products', async (req, res) => {
  const categoryParam = String(req.query.category || '').trim()
  const brandParam = String(req.query.brand || '').trim()
  const lineParam = String(req.query.line || '').trim()
  const searchParam = String(req.query.search || '').trim().toLowerCase()
  const slugsParam = String(req.query.slugs || '').trim()
  const slugsSet = slugsParam ? new Set(slugsParam.split(',').map(s => s.trim()).filter(Boolean)) : null

  try {
    // определяем, какие листы читать
    let sheetNames: string[]
    if (categoryParam) {
      sheetNames = [categoryParam]
    } else {
      // все листы, кроме служебных
      const SERVICE_SHEETS = new Set(['categories', 'brands', 'lines', 'content', 'orders', 'miniapp_users', 'settings', 'promocodes', 'visits'])
      const all = await getSheetTitles(SHEET_ID)
      sheetNames = all.filter(n => !SERVICE_SHEETS.has(n.toLowerCase()))
    }

    const allProducts: any[] = []
    for (const sheetName of sheetNames) {
      try {
        const rows = await readSheet(SHEET_ID, `${sheetName}!A1:Q1000`)
        const products = parseProductRows(rows, sheetName)
        allProducts.push(...products)
      } catch (e: any) {
        logger.warn({ sheetName, error: e?.message }, 'не удалось прочитать лист товаров')
      }
    }

    // дедупликация по slug
    const bySlug = new Map<string, any>()
    for (const p of allProducts) {
      if (!bySlug.has(p.slug)) bySlug.set(p.slug, p)
    }

    let products = Array.from(bySlug.values())

    if (brandParam) products = products.filter(p => p.brand?.toLowerCase() === brandParam.toLowerCase())
    if (lineParam) products = products.filter(p => p.line?.toLowerCase() === lineParam.toLowerCase())
    if (searchParam) {
      products = products.filter(p =>
        p.title.toLowerCase().includes(searchParam) ||
        p.description?.toLowerCase().includes(searchParam)
      )
    }
    if (slugsSet) products = products.filter(p => slugsSet.has(p.slug))

    res.json(products)
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка чтения товаров')
    res.status(500).json({ error: 'server_error' })
  }
})

// GET /api/catalog/products/:slug — конкретный товар
router.get('/products/:slug', async (req, res) => {
  const slug = req.params.slug

  try {
    const SERVICE_SHEETS = new Set(['categories', 'brands', 'lines', 'content', 'orders', 'miniapp_users', 'settings', 'promocodes', 'visits'])
    const all = await getSheetTitles(SHEET_ID)
    const sheetNames = all.filter(n => !SERVICE_SHEETS.has(n.toLowerCase()))

    for (const sheetName of sheetNames) {
      try {
        const rows = await readSheet(SHEET_ID, `${sheetName}!A1:Q1000`)
        const products = parseProductRows(rows, sheetName)
        const found = products.find(p => p.slug === slug)
        if (found) return res.json(found)
      } catch {
        // пропускаем недоступные листы
      }
    }

    res.status(404).json({ error: 'not_found' })
  } catch (e: any) {
    logger.error({ error: e?.message, slug }, 'ошибка поиска товара по slug')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
