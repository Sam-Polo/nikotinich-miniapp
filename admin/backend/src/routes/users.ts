import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchUsersFromSheet,
  saveUsersToSheet,
  type User
} from '../users-utils.js'
import pino from 'pino'

const logger = pino()
const router = express.Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }
    const users = await fetchUsersFromSheet(sheetId)
    return res.json({ users })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки пользователей')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки пользователей' })
  }
})

function toUser(raw: any): User {
  return {
    telegram_id: String(raw.telegram_id ?? '').trim(),
    username: String(raw.username ?? '').trim(),
    email: String(raw.email ?? '').trim(),
    phone: String(raw.phone ?? '').trim(),
    role: String(raw.role ?? 'user').trim() || 'user',
    active: raw === true || raw === 'true' || raw === '1' || raw === 1,
    referrer_id: raw.referrer_id !== undefined ? String(raw.referrer_id).trim() || undefined : undefined,
    referral_balance_rub: raw.referral_balance_rub !== undefined ? Math.max(0, Number(raw.referral_balance_rub) || 0) : undefined
  }
}

router.post('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }

    const u = toUser(req.body)
    if (!u.telegram_id) {
      return res.status(400).json({ error: 'missing_telegram_id' })
    }

    const users = await fetchUsersFromSheet(sheetId)
    if (users.some((x) => x.telegram_id === u.telegram_id)) {
      return res.status(400).json({ error: 'telegram_id_already_exists' })
    }
    // при создании из мини-аппа с ref передаётся referrer_id; остальные поля могут быть пустыми
    const newUser: User = {
      ...u,
      referrer_id: u.referrer_id || undefined,
      referral_balance_rub: u.referral_balance_rub !== undefined ? u.referral_balance_rub : 0
    }
    users.push(newUser)
    await saveUsersToSheet(sheetId, users)
    return res.json({ success: true, user: newUser })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка создания пользователя')
    return res.status(500).json({ error: error?.message || 'Ошибка создания пользователя' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }

    const raw = req.body
    const telegram_id = String(raw?.telegram_id ?? '').trim()
    if (!telegram_id) {
      return res.status(400).json({ error: 'missing_telegram_id' })
    }

    const users = await fetchUsersFromSheet(sheetId)
    const idx = users.findIndex((x) => x.telegram_id === telegram_id)
    if (idx === -1) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    const existing = users[idx]
    users[idx] = {
      telegram_id: existing.telegram_id,
      username: raw.username !== undefined ? String(raw.username).trim() : existing.username,
      email: raw.email !== undefined ? String(raw.email).trim() : existing.email,
      phone: raw.phone !== undefined ? String(raw.phone).trim() : existing.phone,
      role: raw.role !== undefined ? (String(raw.role).trim() || 'user') : existing.role,
      active: raw.active !== undefined ? (raw.active === true || raw.active === 'true' || raw.active === '1') : existing.active,
      referrer_id: raw.referrer_id !== undefined ? (String(raw.referrer_id).trim() || undefined) : existing.referrer_id,
      referral_balance_rub: raw.referral_balance_rub !== undefined ? Math.max(0, Number(raw.referral_balance_rub) || 0) : existing.referral_balance_rub
    }
    await saveUsersToSheet(sheetId, users)
    return res.json({ success: true, user: users[idx] })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка обновления пользователя')
    return res.status(500).json({ error: error?.message || 'Ошибка обновления пользователя' })
  }
})

router.delete('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }
    const telegram_id = String(req.body?.telegram_id ?? req.query?.telegram_id ?? '').trim()
    if (!telegram_id) {
      return res.status(400).json({ error: 'missing_telegram_id' })
    }
    const users = await fetchUsersFromSheet(sheetId)
    const idx = users.findIndex((x) => x.telegram_id === telegram_id)
    if (idx === -1) {
      return res.status(404).json({ error: 'user_not_found' })
    }
    users.splice(idx, 1)
    await saveUsersToSheet(sheetId, users)
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка удаления пользователя')
    return res.status(500).json({ error: error?.message || 'Ошибка удаления пользователя' })
  }
})

export default router
