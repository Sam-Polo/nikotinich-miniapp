import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'
import pino from 'pino'

const logger = pino()

export type Line = {
  brand_key: string
  key: string
  title: string
  image: string
  order: number
}

const SHEET_NAME = 'lines'
const DEFAULT_HEADERS = ['brand_key', 'title', 'key', 'image', 'order']

async function ensureLinesSheet(sheets: any, sheetId: string): Promise<void> {
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
    logger.info('лист lines создан')
  }
}

export async function fetchLinesFromSheet(sheetId: string): Promise<Line[]> {
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

    const lines: Line[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const get = (n: string) => String(r[idx(n)] ?? '').trim()
      const brand_key = get('brand_key')
      const key = get('key')
      if (!brand_key || !key) continue

      const order = parseInt(get('order'), 10)
      lines.push({
        brand_key,
        key,
        title: get('title') || key,
        image: get('image') || '',
        order: Number.isFinite(order) ? order : i
      })
    }

    lines.sort((a, b) => a.order - b.order)
    return lines
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unable to parse range') || msg.includes('распознать') || e?.code === 400) {
      return []
    }
    throw e
  }
}

export async function fetchLinesByBrand(sheetId: string, brandKey: string): Promise<Line[]> {
  const all = await fetchLinesFromSheet(sheetId)
  return all.filter((l) => l.brand_key.toLowerCase() === brandKey.toLowerCase())
}

export async function saveLinesToSheet(sheetId: string, lines: Line[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureLinesSheet(sheets, sheetId)

  const values = [
    DEFAULT_HEADERS,
    ...lines.map((c, i) => [
      c.brand_key,
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
      logger.debug({ error: e?.message }, 'очистка лишних строк lines')
    }
  }

  logger.info({ count: lines.length }, 'линейки сохранены в Google Sheets')
}
