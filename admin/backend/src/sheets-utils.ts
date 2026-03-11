import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pino from 'pino'

const logger = pino()

// корень backend (admin/backend) — для разрешения относительных путей из .env независимо от cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '..')

export type SheetProduct = {
  id?: string
  slug: string
  title: string
  description?: string
  category: string
  categories?: string[] // все категории (для админки)
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
  // вариативные товары (семейства, вкусы, количество затяжек)
  familyKey?: string
  flavor?: string
  puffs?: number
}

// получение авторизации для Google Sheets (с правами на чтение и запись)
export function getAuthFromEnv() {
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
  
  // права на чтение и запись
  const scopes = ['https://www.googleapis.com/auth/spreadsheets']
  return new google.auth.JWT(creds.client_email, undefined, creds.private_key, scopes)
}

// преобразование категории в имя листа: если задан SHEET_NAMES — подставляем точное имя из списка (регистр), иначе — как есть
export function normalizeSheetName(category: string): string {
  const list = process.env.SHEET_NAMES?.split(',').map((s) => s.trim()).filter(Boolean)
  if (!list?.length) return category.trim()
  const normalized = list.find((name) => name.toLowerCase() === category.trim().toLowerCase())
  return normalized ?? category.trim()
}

// колонки листа товаров категории
const PRODUCT_SHEET_HEADERS = [
  'slug',
  'title',
  'description',
  'price_rub',
  'discount_price_rub',
  'images',
  'image_keys',
  'active',
  'stock',
  'article',
  'brand',
  'line',
  'strength',
  'family_key',
  'flavor',
  'puffs'
]

// проверка/создание листа товаров для категории (с заголовками)
export async function ensureProductSheet(
  auth: any,
  sheetId: string,
  sheetName: string
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = spreadsheet.data.sheets?.some(
    (s: any) => s.properties?.title === sheetName
  )
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: sheetName }
          }
        }]
      }
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:Z1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [PRODUCT_SHEET_HEADERS]
      }
    })
    logger.info({ sheetName }, 'лист категории создан')
  }
}

// получение структуры заголовков листа
export async function getSheetHeaders(
  auth: any,
  sheetId: string,
  sheetName: string
): Promise<{ headers: string[], headerIndex: Record<string, number> }> {
  const sheets = google.sheets({ version: 'v4', auth })
  // нормализуем имя листа
  const normalizedSheetName = normalizeSheetName(sheetName)
  const range = `${normalizedSheetName}!A1:Z1`
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
  const rows = res.data.values ?? []
  
  if (rows.length === 0) {
    // если заголовков нет, создаем стандартные
    const defaultHeaders = ['id', ...PRODUCT_SHEET_HEADERS]
    const headerIndex: Record<string, number> = {}
    defaultHeaders.forEach((h, i) => { headerIndex[h] = i })
    return { headers: defaultHeaders, headerIndex }
  }
  
  const headers = rows[0].map((h: string) => h.trim().toLowerCase())
  const headerIndex: Record<string, number> = {}
  headers.forEach((h, i) => { headerIndex[h] = i })
  
  return { headers, headerIndex }
}

// поиск строки товара по slug
export async function findProductRow(
  auth: any,
  sheetId: string,
  sheetName: string,
  slug: string
): Promise<number | null> {
  const sheets = google.sheets({ version: 'v4', auth })
  // нормализуем имя листа
  const normalizedSheetName = normalizeSheetName(sheetName)
  const range = `${normalizedSheetName}!A:Z`
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
  const rows = res.data.values ?? []
  
  if (rows.length === 0) return null
  
  const header = rows[0].map((h: string) => h.trim().toLowerCase())
  const slugIndex = header.indexOf('slug')
  
  if (slugIndex === -1) return null
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][slugIndex]?.trim() === slug) {
      return i + 1 // номер строки в Google Sheets (1-based)
    }
  }
  
  return null
}

// добавление товара в лист
export async function appendProductToSheet(
  auth: any,
  sheetId: string,
  sheetName: string,
  product: SheetProduct
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  
  // нормализуем имя листа
  const normalizedSheetName = normalizeSheetName(sheetName)
  
  // получаем заголовки
  const { headers, headerIndex } = await getSheetHeaders(auth, sheetId, normalizedSheetName)
  
  // формируем строку данных
  const row: any[] = new Array(headers.length).fill('')
  
  // заполняем данные по индексам колонок
  if (headerIndex.id !== undefined) row[headerIndex.id] = product.id || ''
  if (headerIndex.slug !== undefined) row[headerIndex.slug] = product.slug
  if (headerIndex.title !== undefined) row[headerIndex.title] = product.title
  if (headerIndex.description !== undefined) row[headerIndex.description] = product.description || ''
  if (headerIndex.price_rub !== undefined) row[headerIndex.price_rub] = product.price_rub
  if (headerIndex.discount_price_rub !== undefined) row[headerIndex.discount_price_rub] = product.discount_price_rub !== undefined ? product.discount_price_rub : ''
  if (headerIndex.images !== undefined) row[headerIndex.images] = product.images.join('\n')
  if (headerIndex.image_keys !== undefined) row[headerIndex.image_keys] = product.image_keys?.join('\n') || ''
  if (headerIndex.active !== undefined) row[headerIndex.active] = product.active ? 1 : 0
  if (headerIndex.stock !== undefined) row[headerIndex.stock] = product.stock !== undefined ? product.stock : ''
  if (headerIndex.article !== undefined) row[headerIndex.article] = product.article || ''
  if (headerIndex.brand !== undefined) row[headerIndex.brand] = product.brand || ''
  if (headerIndex.line !== undefined) row[headerIndex.line] = product.line || ''
  if (headerIndex.strength !== undefined) row[headerIndex.strength] = product.strength || ''
  if (headerIndex.family_key !== undefined) row[headerIndex.family_key] = product.familyKey || ''
  if (headerIndex.flavor !== undefined) row[headerIndex.flavor] = product.flavor || ''
  if (headerIndex.puffs !== undefined) row[headerIndex.puffs] = product.puffs !== undefined && product.puffs !== null ? product.puffs : ''

  // добавляем строку в конец листа
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${normalizedSheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row]
    }
  })
  
  logger.info({ slug: product.slug, sheetName: normalizedSheetName }, 'товар добавлен в Google Sheets')
}

// обновление товара в листе
export async function updateProductInSheet(
  auth: any,
  sheetId: string,
  sheetName: string,
  oldSlug: string,
  product: SheetProduct
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  
  // нормализуем имя листа
  const normalizedSheetName = normalizeSheetName(sheetName)
  
  // находим строку товара
  const rowNumber = await findProductRow(auth, sheetId, normalizedSheetName, oldSlug)
  if (!rowNumber) {
    throw new Error(`Товар со slug "${oldSlug}" не найден в листе "${normalizedSheetName}"`)
  }
  
  // получаем заголовки
  const { headers, headerIndex } = await getSheetHeaders(auth, sheetId, normalizedSheetName)
  
  // формируем строку данных
  const row: any[] = new Array(headers.length).fill('')
  
  // заполняем данные
  if (headerIndex.id !== undefined) row[headerIndex.id] = product.id || ''
  if (headerIndex.slug !== undefined) row[headerIndex.slug] = product.slug
  if (headerIndex.title !== undefined) row[headerIndex.title] = product.title
  if (headerIndex.description !== undefined) row[headerIndex.description] = product.description || ''
  if (headerIndex.price_rub !== undefined) row[headerIndex.price_rub] = product.price_rub
  if (headerIndex.discount_price_rub !== undefined) row[headerIndex.discount_price_rub] = product.discount_price_rub !== undefined ? product.discount_price_rub : ''
  if (headerIndex.images !== undefined) row[headerIndex.images] = product.images.join('\n')
  if (headerIndex.image_keys !== undefined) row[headerIndex.image_keys] = product.image_keys?.join('\n') || ''
  if (headerIndex.active !== undefined) row[headerIndex.active] = product.active ? 1 : 0
  if (headerIndex.stock !== undefined) row[headerIndex.stock] = product.stock !== undefined ? product.stock : ''
  if (headerIndex.article !== undefined) row[headerIndex.article] = product.article || ''
  if (headerIndex.brand !== undefined) row[headerIndex.brand] = product.brand || ''
  if (headerIndex.line !== undefined) row[headerIndex.line] = product.line || ''
  if (headerIndex.strength !== undefined) row[headerIndex.strength] = product.strength || ''
  if (headerIndex.family_key !== undefined) row[headerIndex.family_key] = product.familyKey || ''
  if (headerIndex.flavor !== undefined) row[headerIndex.flavor] = product.flavor || ''
  if (headerIndex.puffs !== undefined) row[headerIndex.puffs] = product.puffs !== undefined && product.puffs !== null ? product.puffs : ''

  // обновляем строку
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${normalizedSheetName}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row]
    }
  })
  
  logger.info({ slug: product.slug, sheetName: normalizedSheetName, rowNumber }, 'товар обновлен в Google Sheets')
}

// удаление товара из листа
export async function deleteProductFromSheet(
  auth: any,
  sheetId: string,
  sheetName: string,
  slug: string
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  
  // нормализуем имя листа
  const normalizedSheetName = normalizeSheetName(sheetName)
  
  // находим строку товара
  const rowNumber = await findProductRow(auth, sheetId, normalizedSheetName, slug)
  if (!rowNumber) {
    throw new Error(`Товар со slug "${slug}" не найден в листе "${normalizedSheetName}"`)
  }
  
  // получаем ID листа
  const sheetIdNum = await getSheetIdByName(auth, sheetId, normalizedSheetName)
  
  // удаляем строку
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetIdNum,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }]
    }
  })
  
  logger.info({ slug, sheetName: normalizedSheetName }, 'товар удален из Google Sheets')
}

// получение ID листа по имени
export async function getSheetIdByName(auth: any, sheetId: string, sheetName: string): Promise<number> {
  const sheets = google.sheets({ version: 'v4', auth })
  
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  
  // ищем лист с учетом регистра
  let sheet = res.data.sheets?.find(s => s.properties?.title === sheetName)
  
  // если не нашли точное совпадение, пробуем без учета регистра
  if (!sheet) {
    sheet = res.data.sheets?.find(s => s.properties?.title?.toLowerCase() === sheetName.toLowerCase())
  }
  
  if (!sheet) {
    throw new Error(`Лист "${sheetName}" не найден`)
  }
  
  // проверяем что sheetId существует (может быть 0, что валидно!)
  if (sheet.properties?.sheetId === undefined || sheet.properties?.sheetId === null) {
    // пробуем получить sheetId из другого места, если он есть
    const alternativeSheetId = (sheet as any).sheetId || (sheet as any).id
    if (alternativeSheetId !== undefined && alternativeSheetId !== null) {
      return alternativeSheetId
    }
    throw new Error(`Лист "${sheetName}" найден, но не содержит sheetId`)
  }
  
  return sheet.properties.sheetId
}

// перемещение строки товара в новую позицию
export async function moveProductRow(
  auth: any,
  sheetId: string,
  sheetName: string,
  fromRow: number,
  toRow: number
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const normalizedSheetName = normalizeSheetName(sheetName)
  const sheetIdNum = await getSheetIdByName(auth, sheetId, normalizedSheetName)
  
  // Google Sheets использует 0-based индексы для API
  const fromIndex = fromRow - 1
  const toIndex = toRow - 1
  
  // если позиция не изменилась, ничего не делаем
  if (fromIndex === toIndex) return
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        moveDimension: {
          source: {
            sheetId: sheetIdNum,
            dimension: 'ROWS',
            startIndex: fromIndex,
            endIndex: fromIndex + 1
          },
          destinationIndex: toIndex
        }
      }]
    }
  })
  
  logger.info({ sheetName: normalizedSheetName, fromRow, toRow }, 'строка перемещена в Google Sheets')
}

// переупорядочивание товаров в категории
export async function reorderProductsInSheet(
  auth: any,
  sheetId: string,
  sheetName: string,
  productSlugs: string[]
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const normalizedSheetName = normalizeSheetName(sheetName)
  const sheetIdNum = await getSheetIdByName(auth, sheetId, normalizedSheetName)
  
  // получаем все строки листа (включая заголовок)
  const range = `${normalizedSheetName}!A:Z`
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
  const allRows = res.data.values ?? []
  
  if (allRows.length < 2) {
    logger.warn({ sheetName: normalizedSheetName }, 'недостаточно строк для переупорядочивания')
    return
  }
  
  const header = allRows[0]
  const slugIndex = header.map((h: string) => h.trim().toLowerCase()).indexOf('slug')
  
  if (slugIndex === -1) {
    throw new Error(`Колонка 'slug' не найдена в листе "${normalizedSheetName}"`)
  }
  
  // создаем карту: slug -> строка данных
  const rowMap = new Map<string, any[]>()
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i]
    if (row && row[slugIndex]) {
      const slug = String(row[slugIndex]).trim()
      if (slug && productSlugs.includes(slug)) {
        rowMap.set(slug, row)
      }
    }
  }
  
  // создаем новый порядок строк: заголовок + товары в нужном порядке + остальные товары
  const reorderedRows: any[][] = [header]
  const processedSlugs = new Set<string>()
  
  // добавляем товары в нужном порядке
  for (const slug of productSlugs) {
    const row = rowMap.get(slug)
    if (row) {
      reorderedRows.push(row)
      processedSlugs.add(slug)
    }
  }
  
  // добавляем остальные товары, которых нет в productSlugs (если есть)
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i]
    if (row && row[slugIndex]) {
      const slug = String(row[slugIndex]).trim()
      if (slug && !processedSlugs.has(slug)) {
        reorderedRows.push(row)
      }
    }
  }
  
  // проверка безопасности: количество строк должно совпадать (заголовок + данные)
  const originalDataRows = allRows.length - 1 // без заголовка
  const newDataRows = reorderedRows.length - 1 // без заголовка
  if (originalDataRows !== newDataRows) {
    throw new Error(`Безопасность: количество строк изменилось (было: ${originalDataRows}, стало: ${newDataRows}). Операция отменена.`)
  }
  
  // перезаписываем весь диапазон с новым порядком
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${normalizedSheetName}!A1:Z${reorderedRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: reorderedRows
    }
  })
  
  logger.info({ sheetName: normalizedSheetName, count: productSlugs.length, totalRows: reorderedRows.length }, 'товары переупорядочены в Google Sheets')
}
