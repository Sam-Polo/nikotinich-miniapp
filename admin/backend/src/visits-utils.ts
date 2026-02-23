import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'

const SHEET_NAME = 'visits'
const HEADERS = ['date', 'user_id']

async function ensureVisitsSheet(auth: any, sheetId: string): Promise<void> {
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
      range: `${SHEET_NAME}!A1:B1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    })
  }
}

export type VisitRow = { date: string; userId: string }

export async function fetchVisitsFromSheet(sheetId: string): Promise<VisitRow[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureVisitsSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:B50000`
  })
  const rows = res.data.values ?? []
  return rows.map((row) => ({
    date: String(row[0] || '').trim(),
    userId: String(row[1] || '').trim()
  })).filter((r) => r.date && r.userId)
}

export async function appendVisit(sheetId: string, userId: string): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureVisitsSheet(auth, sheetId)
  const date = new Date().toISOString().slice(0, 10)
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A:B`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[date, userId]] }
  })
}

export type VisitsStats = { uniqueUsersPeriod: number; uniqueUsersAllTime: number }

export async function getVisitsStats(
  sheetId: string,
  period: '7d' | '30d' | 'all'
): Promise<VisitsStats> {
  const rows = await fetchVisitsFromSheet(sheetId)
  const allUserIds = new Set(rows.map((r) => r.userId))
  const uniqueUsersAllTime = allUserIds.size

  if (period === 'all') {
    return { uniqueUsersPeriod: uniqueUsersAllTime, uniqueUsersAllTime }
  }

  const now = new Date()
  const toDate = now.toISOString().slice(0, 10)
  let fromDate: string
  if (period === '7d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    fromDate = d.toISOString().slice(0, 10)
  } else {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    fromDate = d.toISOString().slice(0, 10)
  }

  const inPeriod = rows.filter((r) => r.date >= fromDate && r.date <= toDate)
  const uniqueInPeriod = new Set(inPeriod.map((r) => r.userId)).size

  return { uniqueUsersPeriod: uniqueInPeriod, uniqueUsersAllTime }
}
