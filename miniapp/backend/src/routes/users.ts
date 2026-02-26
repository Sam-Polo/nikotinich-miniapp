import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { readSheet, ensureSheet, appendRow, getAuth } from '../sheets-utils.js'
import { google } from 'googleapis'
import { logger } from '../logger.js'

const router = Router()

const SHEET_NAME = 'miniapp_users'
const HEADERS = ['telegram_id', 'username', 'email', 'phone', 'role', 'active', 'referrer_id', 'referral_balance_rub']

type User = {
  telegram_id: string
  username: string
  email: string
  phone: string
  role: string
  active: boolean
  referrer_id?: string
  referral_balance_rub: number
}

async function parseUsersFromSheet(): Promise<{ users: User[]; rowMap: Map<string, number> }> {
  const rows = await readSheet(SHEET_ID, `${SHEET_NAME}!A1:H2000`)
  const rowMap = new Map<string, number>()

  if (rows.length < 2) return { users: [], rowMap }

  const header = rows[0].map((h: string) => h.trim().toLowerCase())
  const idx = (n: string) => header.indexOf(n)

  const users: User[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue
    const get = (n: string) => String(r[idx(n)] ?? '').trim()
    const telegram_id = get('telegram_id')
    if (!telegram_id) continue

    const activeVal = get('active').toLowerCase()
    rowMap.set(telegram_id, i + 1) // +1 т.к. строки в Sheets 1-indexed

    users.push({
      telegram_id,
      username: get('username') || '',
      email: get('email') || '',
      phone: get('phone') || '',
      role: get('role') || 'user',
      active: activeVal === '1' || activeVal === 'true' || activeVal === 'yes',
      referrer_id: get('referrer_id') || undefined,
      referral_balance_rub: Math.max(0, Number(get('referral_balance_rub')) || 0)
    })
  }

  return { users, rowMap }
}

// GET /api/users/:telegram_id — профиль пользователя
router.get('/:telegram_id', async (req, res) => {
  const telegram_id = req.params.telegram_id

  try {
    await ensureSheet(SHEET_ID, SHEET_NAME, HEADERS)
    const { users } = await parseUsersFromSheet()
    const user = users.find(u => u.telegram_id === telegram_id)

    if (!user) return res.status(404).json({ error: 'not_found' })
    res.json(user)
  } catch (e: any) {
    logger.error({ error: e?.message, telegram_id }, 'ошибка получения пользователя')
    res.status(500).json({ error: 'server_error' })
  }
})

// POST /api/users — создать или обновить пользователя
router.post('/', async (req, res) => {
  const { telegram_id, username, email, phone, referrer_id } = req.body

  if (!telegram_id) return res.status(400).json({ error: 'telegram_id_required' })

  try {
    await ensureSheet(SHEET_ID, SHEET_NAME, HEADERS)
    const { users, rowMap } = await parseUsersFromSheet()
    const existing = users.find(u => u.telegram_id === telegram_id)

    if (existing) {
      // обновляем только те поля, которые пришли в теле
      const updated: User = {
        ...existing,
        username: username ?? existing.username,
        email: email ?? existing.email,
        phone: phone ?? existing.phone
      }
      // referrer_id устанавливается только один раз
      if (!existing.referrer_id && referrer_id && referrer_id !== telegram_id) {
        updated.referrer_id = referrer_id
      }

      const rowIndex = rowMap.get(telegram_id)
      if (rowIndex) {
        const auth = getAuth()
        const sheets = google.sheets({ version: 'v4', auth })
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              updated.telegram_id,
              updated.username,
              updated.email,
              updated.phone,
              updated.role,
              updated.active ? '1' : '0',
              updated.referrer_id || '',
              String(updated.referral_balance_rub)
            ]]
          }
        })
      }

      logger.info({ telegram_id }, 'пользователь обновлён')
      return res.json(updated)
    }

    // создаём нового пользователя
    const newUser: User = {
      telegram_id,
      username: username || '',
      email: email || '',
      phone: phone || '',
      role: 'user',
      active: true,
      referrer_id: (referrer_id && referrer_id !== telegram_id) ? referrer_id : undefined,
      referral_balance_rub: 0
    }

    await appendRow(SHEET_ID, SHEET_NAME, [
      newUser.telegram_id,
      newUser.username,
      newUser.email,
      newUser.phone,
      newUser.role,
      '1',
      newUser.referrer_id || '',
      '0'
    ])

    logger.info({ telegram_id, referrer_id: newUser.referrer_id }, 'пользователь создан')
    res.status(201).json(newUser)
  } catch (e: any) {
    logger.error({ error: e?.message, telegram_id }, 'ошибка создания/обновления пользователя')
    res.status(500).json({ error: 'server_error' })
  }
})

// PUT /api/users/:telegram_id — обновить телефон и email
router.put('/:telegram_id', async (req, res) => {
  const telegram_id = req.params.telegram_id
  const { email, phone, username } = req.body

  try {
    const { users, rowMap } = await parseUsersFromSheet()
    const existing = users.find(u => u.telegram_id === telegram_id)
    if (!existing) return res.status(404).json({ error: 'not_found' })

    const updated: User = {
      ...existing,
      username: username ?? existing.username,
      email: email ?? existing.email,
      phone: phone ?? existing.phone
    }

    const rowIndex = rowMap.get(telegram_id)
    if (rowIndex) {
      const auth = getAuth()
      const sheets = google.sheets({ version: 'v4', auth })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            updated.telegram_id,
            updated.username,
            updated.email,
            updated.phone,
            updated.role,
            updated.active ? '1' : '0',
            updated.referrer_id || '',
            String(updated.referral_balance_rub)
          ]]
        }
      })
    }

    logger.info({ telegram_id }, 'профиль обновлён')
    res.json(updated)
  } catch (e: any) {
    logger.error({ error: e?.message, telegram_id }, 'ошибка обновления профиля')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
