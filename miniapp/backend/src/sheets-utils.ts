import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '..')

// авторизация Google Sheets через сервисный аккаунт
export function getAuth() {
  const filePath = process.env.GOOGLE_SA_FILE
  const raw = process.env.GOOGLE_SA_JSON
  let creds: any

  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(BACKEND_ROOT, filePath)
    const txt = fs.readFileSync(resolved, 'utf8')
    creds = JSON.parse(txt)
  } else if (raw) {
    creds = JSON.parse(raw)
  } else {
    throw new Error('GOOGLE_SA_JSON or GOOGLE_SA_FILE is required')
  }

  const scopes = ['https://www.googleapis.com/auth/spreadsheets']
  return new google.auth.JWT(creds.client_email, undefined, creds.private_key, scopes)
}

// чтение диапазона листа, возвращает строки начиная с 0
export async function readSheet(sheetId: string, range: string): Promise<string[][]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
  return (res.data.values ?? []) as string[][]
}

// добавление строки в конец листа
export async function appendRow(sheetId: string, sheetName: string, row: string[]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  })
}

// обновление конкретного диапазона
export async function updateRange(sheetId: string, range: string, values: string[][]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
}

// получение списка листов таблицы
export async function getSheetTitles(sheetId: string): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties.title' })
  return (res.data.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean)
}

// проверка существования листа
export async function sheetExists(sheetId: string, sheetName: string): Promise<boolean> {
  const titles = await getSheetTitles(sheetId)
  return titles.includes(sheetName)
}

// создание нового листа с заголовками
export async function ensureSheet(sheetId: string, sheetName: string, headers: string[]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const exists = await sheetExists(sheetId, sheetName)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] }
    })
  }
}
