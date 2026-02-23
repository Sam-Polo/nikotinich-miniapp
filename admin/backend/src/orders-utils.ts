import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { getAuthFromEnv } from './sheets-utils.js'

export type OrderStatus = 'new' | 'confirmed' | 'packed' | 'completed' | 'cancelled'

export type OrderItem = {
  slug: string
  qty: number
  title?: string
  priceRub?: number
}

export type Order = {
  id: string
  userId?: string
  customerName: string
  phone?: string
  address?: string
  items: OrderItem[]
  totalRub: number
  promoCode?: string
  deliveryFee: number
  status: OrderStatus
  createdAt: string
  confirmedAt?: string
  note?: string
  referralBonusAccrued?: boolean
}

const SHEET_NAME = 'orders'
const HEADERS = [
  'id',
  'user_id',
  'customer_name',
  'phone',
  'address',
  'items_json',
  'total_rub',
  'promo_code',
  'delivery_fee',
  'status',
  'created_at',
  'confirmed_at',
  'note',
  'referral_bonus_accrued'
]

async function ensureOrdersSheet(auth: any, sheetId: string): Promise<void> {
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
      range: `${SHEET_NAME}!A1:N1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] }
    })
  }
}

export async function fetchOrdersFromSheet(sheetId: string): Promise<Order[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureOrdersSheet(auth, sheetId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:N2000`
  })
  const rows = res.data.values ?? []
  const orders = rows.map((row) => {
    let items: OrderItem[] = []
    try {
      const parsed = JSON.parse(String(row[5] || '[]'))
      if (Array.isArray(parsed)) items = parsed
    } catch {
      items = []
    }
    return {
      id: String(row[0] || '').trim() || randomUUID(),
      userId: String(row[1] || '').trim() || undefined,
      customerName: String(row[2] || '').trim(),
      phone: String(row[3] || '').trim() || undefined,
      address: String(row[4] || '').trim() || undefined,
      items,
      totalRub: Number(row[6] || 0),
      promoCode: String(row[7] || '').trim() || undefined,
      deliveryFee: Number(row[8] || 0),
      status: (() => {
        const s = String(row[9] || 'new').trim().toLowerCase()
        return (s === 'delivered' ? 'completed' : s) as OrderStatus
      })(),
      createdAt: String(row[10] || '').trim() || new Date().toISOString(),
      confirmedAt: String(row[11] || '').trim() || undefined,
      note: String(row[12] || '').trim() || undefined,
      referralBonusAccrued: (() => {
        const v = String(row[13] || '').trim().toLowerCase()
        return v === '1' || v === 'true' || v === 'да' || v === 'yes'
      })()
    } satisfies Order
  }).filter((order) => order.customerName.length > 0)

  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveOrdersToSheet(sheetId: string, orders: Order[]): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  await ensureOrdersSheet(auth, sheetId)
  const values = [
    HEADERS,
    ...orders.map((order) => [
      order.id,
      order.userId || '',
      order.customerName,
      order.phone || '',
      order.address || '',
      JSON.stringify(order.items || []),
      order.totalRub,
      order.promoCode || '',
      order.deliveryFee,
      order.status,
      order.createdAt,
      order.confirmedAt || '',
      order.note || '',
      order.referralBonusAccrued ? '1' : '0'
    ])
  ]
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:N${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
  if (values.length < 2000) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${values.length + 1}:N2000`
    })
  }
}
