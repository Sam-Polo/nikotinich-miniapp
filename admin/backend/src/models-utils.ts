import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'
import { logger } from './logger.js'

export type Model = {
  category_key: string
  brand_key: string
  line_key: string
  key: string
  title: string
  image: string
  order: number
}

const SHEET_NAME = 'models'
const DEFAULT_HEADERS = ['category_key', 'brand_key', 'line_key', 'title', 'key', 'image', 'order']

async function ensureModelsSheet(sheets: any, sheetId: string): Promise<void> {
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
      range: `${SHEET_NAME}!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [DEFAULT_HEADERS]
      }
    })
    logger.info('лист models создан')
  }
}

export async function fetchModelsFromSheet(sheetId: string): Promise<Model[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const range = `${SHEET_NAME}!A1:G500`
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const rows = res.data.values ?? []

    if (rows.length < 2) {
      return []
    }

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (name: string) => header.indexOf(name)

    const models: Model[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const get = (n: string) => String(r[idx(n)] ?? '').trim()
      const category_key = get('category_key')
      const brand_key = get('brand_key')
      const line_key = get('line_key')
      const key = get('key')
      if (!category_key || !brand_key || !line_key || !key) continue

      const order = parseInt(get('order'), 10)
      models.push({
        category_key,
        brand_key,
        line_key,
        key,
        title: get('title') || key,
        image: get('image') || '',
        order: Number.isFinite(order) ? order : i
      })
    }

    models.sort((a, b) => a.order - b.order)
    return models
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unable to parse range') || msg.includes('распознать') || e?.code === 400) {
      return []
    }
    throw e
  }
}

export async function saveModelsToSheet(sheetId: string, models: Model[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureModelsSheet(sheets, sheetId)

  const values = [
    DEFAULT_HEADERS,
    ...models.map((m, i) => [
      m.category_key,
      m.brand_key,
      m.line_key,
      m.title,
      m.key,
      m.image,
      i
    ])
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:G${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })

  if (values.length < 500) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${values.length + 1}:G500`
      })
    } catch (e: any) {
      logger.debug({ error: e?.message }, 'очистка лишних строк models')
    }
  }

  logger.info({ count: models.length }, 'модели сохранены в Google Sheets')
}

