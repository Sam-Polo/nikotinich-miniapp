import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'
import pino from 'pino'

const logger = pino()

export type User = {
  telegram_id: string
  username: string
  email: string
  phone: string
  role: string
  active: boolean
}

const SHEET_NAME = 'miniapp_users'
const DEFAULT_HEADERS = ['telegram_id', 'username', 'email', 'phone', 'role', 'active']

async function ensureUsersSheet(sheets: any, sheetId: string): Promise<void> {
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
      range: `${SHEET_NAME}!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [DEFAULT_HEADERS]
      }
    })
    logger.info('лист miniapp_users создан')
  }
}

function parseBool(val: string): boolean {
  const v = String(val).trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'да' || v === 'yes'
}

export async function fetchUsersFromSheet(sheetId: string): Promise<User[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const range = `${SHEET_NAME}!A1:F2000`
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const rows = res.data.values ?? []

    if (rows.length < 2) {
      return []
    }

    const header = rows[0].map((h: string) => String(h).trim().toLowerCase())
    const idx = (name: string) => header.indexOf(name)

    const users: User[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const get = (n: string) => String(r[idx(n)] ?? '').trim()
      const telegram_id = get('telegram_id')
      if (!telegram_id) continue

      users.push({
        telegram_id,
        username: get('username') || '',
        email: get('email') || '',
        phone: get('phone') || '',
        role: get('role') || 'user',
        active: parseBool(get('active'))
      })
    }

    return users
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unable to parse range') || msg.includes('распознать') || e?.code === 400) {
      return []
    }
    throw e
  }
}

export async function saveUsersToSheet(sheetId: string, users: User[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureUsersSheet(sheets, sheetId)

  const values = [
    DEFAULT_HEADERS,
    ...users.map((u) => [
      u.telegram_id,
      u.username,
      u.email || '',
      u.phone || '',
      u.role || 'user',
      u.active ? '1' : '0'
    ])
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:F${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
}
