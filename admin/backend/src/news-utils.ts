import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { getAuthFromEnv, getSheetIdByName } from './sheets-utils.js'

export type NewsItem = {
  id: string
  title: string
  summary?: string
  imageUrl?: string
  publishedAt?: string
  active: boolean
  sort: number
}

const SHEET_NAME = 'news'
const HEADERS = ['id', 'title', 'summary', 'image_url', 'published_at', 'active', 'sort']

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

export async function fetchNewsFromSheet(sheetId: string): Promise<NewsItem[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:G1000`
  })
  const rows = res.data.values ?? []
  const out: NewsItem[] = rows.map((row, idx) => ({
    id: String(row[0] || '').trim() || randomUUID(),
    title: String(row[1] || '').trim(),
    summary: String(row[2] || '').trim() || undefined,
    imageUrl: String(row[3] || '').trim() || undefined,
    publishedAt: String(row[4] || '').trim() || undefined,
    active: ['1', 'true', 'yes'].includes(String(row[5] || '').trim().toLowerCase()),
    sort: Number(row[6] || idx)
  })).filter(item => item.title.length > 0)

  out.sort((a, b) => a.sort - b.sort)
  return out
}

export async function saveNewsToSheet(sheetId: string, items: NewsItem[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const values = [
    HEADERS,
    ...items.map((item, idx) => [
      item.id,
      item.title,
      item.summary || '',
      item.imageUrl || '',
      item.publishedAt || '',
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

export async function deleteNewsFromSheet(sheetId: string, id: string): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:A1000`
  })
  const rows = res.data.values ?? []
  const idx = rows.findIndex((row) => String(row[0] || '').trim() === id)
  if (idx === -1) throw new Error('news_not_found')
  const sheetNumericId = await getSheetIdByName(auth, sheetId, SHEET_NAME)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetNumericId,
            dimension: 'ROWS',
            startIndex: idx + 1,
            endIndex: idx + 2
          }
        }
      }]
    }
  })
}
