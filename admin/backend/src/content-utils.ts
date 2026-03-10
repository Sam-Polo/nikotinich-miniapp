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
  /** дополнительные фото для вставки в текст по маркерам {{img1}}, {{img2}} и т.д. */
  images?: string[]
  publishedAt?: string
  active: boolean
  sort: number
  productSlugs: string[]
  showInStories?: boolean
  /** время на прочтение в минутах (можно считать по объёму текста) */
  readMinutes?: number
  likes?: number
  claps?: number
  dislikes?: number
}

const SHEET_NAME = 'content'
const HEADERS = ['id', 'type', 'title', 'body', 'image_url', 'published_at', 'active', 'sort', 'product_slugs', 'show_in_stories', 'images', 'read_minutes', 'likes', 'claps', 'dislikes']

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
      range: `${SHEET_NAME}!A1:O1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    })
  }
}

/** считает время прочтения по объёму текста: ~200 слов/мин */
export function computeReadMinutes(body: string | undefined): number {
  if (!body || !body.trim()) return 1
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export async function fetchContentFromSheet(sheetId: string): Promise<ContentItem[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:O1000`
  })
  const rows = res.data.values ?? []
  const out: ContentItem[] = rows.map((row, idx) => {
    const type = (String(row[1] || '').trim().toLowerCase() === 'collection' ? 'collection' : 'news') as ContentItemType
    const imagesRaw = String(row[10] || '').trim()
    const images = imagesRaw ? imagesRaw.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean) : undefined
    return {
      id: String(row[0] || '').trim() || randomUUID(),
      type,
      title: String(row[2] || '').trim(),
      body: String(row[3] || '').trim() || undefined,
      imageUrl: String(row[4] || '').trim() || undefined,
      publishedAt: String(row[5] || '').trim() || undefined,
      active: ['1', 'true', 'yes'].includes(String(row[6] || '').trim().toLowerCase()),
      sort: Number(row[7] ?? idx),
      productSlugs: type === 'collection' ? String(row[8] || '').split(/[, \n]/).map((x) => x.trim()).filter(Boolean) : [],
      showInStories: ['1', 'true', 'yes'].includes(String(row[9] || '').trim().toLowerCase()),
      images: images && images.length > 0 ? images : undefined,
      readMinutes: row[11] !== undefined && row[11] !== '' ? Number(row[11]) || undefined : undefined,
      likes: row[12] !== undefined && row[12] !== '' ? Number(row[12]) || 0 : 0,
      claps: row[13] !== undefined && row[13] !== '' ? Number(row[13]) || 0 : 0,
      dislikes: row[14] !== undefined && row[14] !== '' ? Number(row[14]) || 0 : 0
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
      item.type === 'collection' ? item.productSlugs.join(',') : '',
      item.showInStories ? '1' : '0',
      item.images && item.images.length > 0 ? item.images.join(',') : '',
      item.readMinutes !== undefined && item.readMinutes !== null ? String(item.readMinutes) : '',
      item.likes !== undefined && item.likes !== null ? String(item.likes) : '0',
      item.claps !== undefined && item.claps !== null ? String(item.claps) : '0',
      item.dislikes !== undefined && item.dislikes !== null ? String(item.dislikes) : '0'
    ])
  ]
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:O${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
  if (values.length < 1000) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${values.length + 1}:O1000`
    })
  }
}
