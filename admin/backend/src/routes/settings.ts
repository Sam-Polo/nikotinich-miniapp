import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchOrdersSettingsFromSheet,
  saveOrdersSettingsToSheet
} from '../settings-utils.js'
import pino from 'pino'
import axios from 'axios'

const logger = pino()
const router = express.Router()

// функция для вызова импорта в основном бэкенде
async function triggerBackendImport() {
  try {
    const backendUrl = process.env.BACKEND_URL || ''
    const adminKey = process.env.ADMIN_IMPORT_KEY
    
    if (adminKey) {
      await axios.post(`${backendUrl}/admin/import/sheets`, {}, {
        headers: { 'x-admin-key': adminKey },
        timeout: 30000
      })
      logger.info('импорт настроек заказов в основном бэкенде вызван')
    } else {
      logger.warn('ADMIN_IMPORT_KEY не задан, импорт в основном бэкенде пропущен')
    }
  } catch (error: any) {
    // не блокируем выполнение, если импорт не удался
    logger.warn({ error: error?.message }, 'не удалось вызвать импорт в основном бэкенде')
  }
}

// все роуты требуют авторизации
router.use(requireAuth)

// получение настроек заказов
router.get('/orders-status', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }
    
    logger.info('загрузка настроек заказов из Google Sheets')
    const settings = await fetchOrdersSettingsFromSheet(sheetId)
    logger.info('настройки заказов загружены')
    
    return res.json(settings)
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки настроек заказов')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки настроек заказов' })
  }
})

// обновление настроек заказов
router.put('/orders-status', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }
    
    const {
      deliveryFee,
      freeDeliveryFrom,
      referralPercentBefore10,
      referralPercentAfter10
    } = req.body
    
    logger.info('сохранение настроек заказов')
    
    const normalizedDeliveryFee = Number(deliveryFee ?? 300)
    const normalizedFreeDeliveryFrom = Number(freeDeliveryFrom ?? 3500)
    const normalizedReferralBefore = Number(referralPercentBefore10 ?? 3)
    const normalizedReferralAfter = Number(referralPercentAfter10 ?? 5)
    if (!Number.isFinite(normalizedDeliveryFee) || normalizedDeliveryFee < 0) {
      return res.status(400).json({ error: 'invalid_delivery_fee' })
    }
    if (!Number.isFinite(normalizedFreeDeliveryFrom) || normalizedFreeDeliveryFrom < 0) {
      return res.status(400).json({ error: 'invalid_free_delivery_from' })
    }
    if (!Number.isFinite(normalizedReferralBefore) || normalizedReferralBefore < 0) {
      return res.status(400).json({ error: 'invalid_referral_percent_before_10' })
    }
    if (!Number.isFinite(normalizedReferralAfter) || normalizedReferralAfter < 0) {
      return res.status(400).json({ error: 'invalid_referral_percent_after_10' })
    }

    await saveOrdersSettingsToSheet(sheetId, {
      deliveryFee: normalizedDeliveryFee,
      freeDeliveryFrom: normalizedFreeDeliveryFrom,
      referralPercentBefore10: normalizedReferralBefore,
      referralPercentAfter10: normalizedReferralAfter
    })
    
    logger.info('настройки заказов сохранены')
    
    // триггерим импорт в основном бэкенде
    await triggerBackendImport()
    
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения настроек заказов')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения настроек заказов' })
  }
})

export default router


