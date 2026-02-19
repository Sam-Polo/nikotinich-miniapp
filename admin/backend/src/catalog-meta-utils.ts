import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { getAuthFromEnv } from './sheets-utils.js'

export type CatalogMetaItemType = 'brand' | 'line' | 'model' | 'flavor'

export type CatalogMetaItem = {
  id: string
  type: CatalogMetaItemType
  parentId?: string
  title: string
  slug?: string
  imageUrl?: string
  active: boolean
  sort: number
}

const SHEET_NAME = 'catalog_meta'
const HEADERS = ['id', 'type', 'parent_id', 'title', 'slug', 'image_url', 'active', 'sort']

async function ensureSheet(auth: any, sheetId: string): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = spreadsheet.data.sheets?.some((s: any) => s.properties?.title === SHEET_NAME)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    })
  }
}

export async function fetchCatalogMeta(sheetId: string): Promise<CatalogMetaItem[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:H2000`
  })
  const rows = res.data.values ?? []
  return rows.map((row, idx) => ({
    id: String(row[0] || '').trim() || randomUUID(),
    type: (String(row[1] || '').trim().toLowerCase() as CatalogMetaItemType),
    parentId: String(row[2] || '').trim() || undefined,
    title: String(row[3] || '').trim(),
    slug: String(row[4] || '').trim() || undefined,
    imageUrl: String(row[5] || '').trim() || undefined,
    active: ['1', 'true', 'yes'].includes(String(row[6] || '').trim().toLowerCase()),
    sort: Number(row[7] || idx)
  })).filter(item => item.title.length > 0 && ['brand', 'line', 'model', 'flavor'].includes(item.type))
}

export async function saveCatalogMeta(sheetId: string, items: CatalogMetaItem[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const values = [
    HEADERS,
    ...items.map((item, idx) => [
      item.id,
      item.type,
      item.parentId || '',
      item.title,
      item.slug || '',
      item.imageUrl || '',
      item.active ? '1' : '0',
      idx
    ])
  ]
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:H${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
  if (values.length < 2000) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${values.length + 1}:H2000`
    })
  }
}
