import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'
import pino from 'pino'

const logger = pino()

export type Brand = {
  category_key: string
  key: string
  title: string
  image: string
  order: number
}

const SHEET_NAME = 'brands'
const DEFAULT_HEADERS = ['category_key', 'title', 'key', 'image', 'order']

async function ensureBrandsSheet(sheets: any, sheetId: string): Promise<void> {
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
      range: `${SHEET_NAME}!A1:E1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [DEFAULT_HEADERS]
      }
    })
    logger.info('лист brands создан')
  }
}

export async function fetchBrandsFromSheet(sheetId: string): Promise<Brand[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const range = `${SHEET_NAME}!A1:E500`
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const rows = res.data.values ?? []

    if (rows.length < 2) {
      return []
    }

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (name: string) => header.indexOf(name)

    const brands: Brand[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const get = (n: string) => String(r[idx(n)] ?? '').trim()
      const category_key = get('category_key')
      const key = get('key')
      if (!category_key || !key) continue

      const order = parseInt(get('order'), 10)
      brands.push({
        category_key,
        key,
        title: get('title') || key,
        image: get('image') || '',
        order: Number.isFinite(order) ? order : i
      })
    }

    brands.sort((a, b) => a.order - b.order)
    return brands
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unable to parse range') || msg.includes('распознать') || e?.code === 400) {
      return []
    }
    throw e
  }
}

export async function fetchBrandsByCategory(sheetId: string, categoryKey: string): Promise<Brand[]> {
  const all = await fetchBrandsFromSheet(sheetId)
  return all.filter((b) => b.category_key.toLowerCase() === categoryKey.toLowerCase())
}

export async function saveBrandsToSheet(sheetId: string, brands: Brand[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureBrandsSheet(sheets, sheetId)

  const values = [
    DEFAULT_HEADERS,
    ...brands.map((c, i) => [
      c.category_key,
      c.title,
      c.key,
      c.image,
      i
    ])
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:E${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })

  if (values.length < 500) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${values.length + 1}:E500`
      })
    } catch (e: any) {
      logger.debug({ error: e?.message }, 'очистка лишних строк brands')
    }
  }

  logger.info({ count: brands.length }, 'бренды сохранены в Google Sheets')
}
