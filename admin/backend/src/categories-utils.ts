import { google } from 'googleapis'
import { getAuthFromEnv, ensureProductSheet } from './sheets-utils.js'
import { logger } from './logger.js'

export type Category = {
  key: string
  title: string
  image: string
  order: number
}

const SHEET_NAME = 'categories'
const DEFAULT_HEADERS = ['title', 'key', 'image', 'order']

// проверка/создание листа categories
async function ensureCategoriesSheet(sheets: any, sheetId: string): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = spreadsheet.data.sheets?.some(
    (s: any) => s.properties?.title === SHEET_NAME
  )
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: SHEET_NAME }
          }
        }]
      }
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1:D1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [DEFAULT_HEADERS]
      }
    })
    logger.info('лист categories создан')
  }
}

// чтение категорий из Google Sheets
export async function fetchCategoriesFromSheet(sheetId: string): Promise<Category[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const range = `${SHEET_NAME}!A1:F500`
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const rows = res.data.values ?? []

    if (rows.length < 2) {
      return []
    }

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (name: string) => header.indexOf(name)

    const categories: Category[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const get = (n: string) => String(r[idx(n)] ?? '').trim()
      const key = get('key')
      if (!key) continue

      const order = parseInt(get('order'), 10)
      categories.push({
        key,
        title: get('title') || key,
        image: get('image') || '',
        order: Number.isFinite(order) ? order : i
      })
    }

    categories.sort((a, b) => a.order - b.order)
    return categories
  } catch (e: any) {
    // лист может не существовать
    const msg = String(e?.message || '')
    if (msg.includes('Unable to parse range') || msg.includes('распознать') || e?.code === 400) {
      return []
    }
    throw e
  }
}

// сохранение списка категорий (перезапись)
export async function saveCategoriesToSheet(
  sheetId: string,
  categories: Category[]
): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureCategoriesSheet(sheets, sheetId)

  const values = [
    DEFAULT_HEADERS,
    ...categories.map((c, i) => [
      c.title,
      c.key,
      c.image,
      i
    ])
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:D${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })

  // очищаем лишние строки (чтобы при удалении категории старые данные не оставались)
  if (values.length < 500) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${values.length + 1}:D500`
      })
    } catch (e: any) {
      // если диапазон пуст — clear может вернуть ошибку, игнорируем
      logger.debug({ error: e?.message }, 'очистка лишних строк categories')
    }
  }

  // создаём листы товаров для категорий, если их ещё нет (листы с товарами никогда не удаляем)
  for (const c of categories) {
    const key = c.key.trim()
    if (key) {
      try {
        await ensureProductSheet(auth, sheetId, key)
      } catch (e: any) {
        logger.warn({ key, error: e?.message }, 'не удалось создать лист категории')
      }
    }
  }

  logger.info({ count: categories.length }, 'категории сохранены в Google Sheets')
}
