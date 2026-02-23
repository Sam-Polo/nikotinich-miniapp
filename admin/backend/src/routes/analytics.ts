import express from 'express'
import { requireAuth } from '../auth.js'
import { getVisitsStats } from '../visits-utils.js'
import { logger } from '../logger.js'

const router = express.Router()
router.use(requireAuth)

const allowedPeriods = ['7d', '30d', 'all'] as const

router.get('/visits-stats', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const period = (typeof req.query.period === 'string' ? req.query.period.trim().toLowerCase() : '30d') as '7d' | '30d' | 'all'
    const validPeriod = allowedPeriods.includes(period) ? period : '30d'
    const stats = await getVisitsStats(sheetId, validPeriod)
    res.json(stats)
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to get visits stats')
    res.status(500).json({ error: 'failed_to_load_visits_stats' })
  }
})

export default router
