import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { getAuthFromEnv } from './sheets-utils.js'

export type ContentItemType = 'news' | 'collection'

export type ContentItem = {
  id: string
  type: ContentItemType
  title: string
  body?: string
  imageUrl?: string
  publishedAt?: string
  active: boolean
  sort: number
  productSlugs: string[]
}

const SHEET_NAME = 'content'
const HEADERS = ['id', 'type', 'title', 'body', 'image_url', 'published_at', 'active', 'sort', 'product_slugs']

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
      range: `${SHEET_NAME}!A1:I1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    })
  }
}

export async function fetchContentFromSheet(sheetId: string): Promise<ContentItem[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:I1000`
  })
  const rows = res.data.values ?? []
  const out: ContentItem[] = rows.map((row, idx) => {
    const type = (String(row[1] || '').trim().toLowerCase() === 'collection' ? 'collection' : 'news') as ContentItemType
    return {
      id: String(row[0] || '').trim() || randomUUID(),
      type,
      title: String(row[2] || '').trim(),
      body: String(row[3] || '').trim() || undefined,
      imageUrl: String(row[4] || '').trim() || undefined,
      publishedAt: String(row[5] || '').trim() || undefined,
      active: ['1', 'true', 'yes'].includes(String(row[6] || '').trim().toLowerCase()),
      sort: Number(row[7] ?? idx),
      productSlugs: type === 'collection' ? String(row[8] || '').split(/[, \n]/).map((x) => x.trim()).filter(Boolean) : []
    }
  }).filter(item => item.title.length > 0)

  out.sort((a, b) => a.sort - b.sort)
  return out
}

export async function saveContentToSheet(sheetId: string, items: ContentItem[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const values = [
    HEADERS,
    ...items.map((item, idx) => [
      item.id,
      item.type,
      item.title,
      item.body || '',
      item.imageUrl || '',
      item.publishedAt || '',
      item.active ? '1' : '0',
      idx,
      item.type === 'collection' ? item.productSlugs.join(',') : ''
    ])
  ]
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:I${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
  if (values.length < 1000) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${values.length + 1}:I1000`
    })
  }
}
