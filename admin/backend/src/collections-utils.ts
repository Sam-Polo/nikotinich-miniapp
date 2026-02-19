import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { getAuthFromEnv } from './sheets-utils.js'

export type CollectionItem = {
  id: string
  title: string
  description?: string
  imageUrl?: string
  productSlugs: string[]
  active: boolean
  sort: number
}

const SHEET_NAME = 'collections'
const HEADERS = ['id', 'title', 'description', 'image_url', 'product_slugs', 'active', 'sort']

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
      range: `${SHEET_NAME}!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    })
  }
}

export async function fetchCollectionsFromSheet(sheetId: string): Promise<CollectionItem[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:G1000`
  })
  const rows = res.data.values ?? []
  const out: CollectionItem[] = rows.map((row, idx) => ({
    id: String(row[0] || '').trim() || randomUUID(),
    title: String(row[1] || '').trim(),
    description: String(row[2] || '').trim() || undefined,
    imageUrl: String(row[3] || '').trim() || undefined,
    productSlugs: String(row[4] || '').split(/[, \n]/).map((x) => x.trim()).filter(Boolean),
    active: ['1', 'true', 'yes'].includes(String(row[5] || '').trim().toLowerCase()),
    sort: Number(row[6] || idx)
  })).filter(item => item.title.length > 0)
  out.sort((a, b) => a.sort - b.sort)
  return out
}

export async function saveCollectionsToSheet(sheetId: string, items: CollectionItem[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const values = [
    HEADERS,
    ...items.map((item, idx) => [
      item.id,
      item.title,
      item.description || '',
      item.imageUrl || '',
      item.productSlugs.join(','),
      item.active ? '1' : '0',
      idx
    ])
  ]
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:G${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
  if (values.length < 1000) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${values.length + 1}:G1000`
    })
  }
}
