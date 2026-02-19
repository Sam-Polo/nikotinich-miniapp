import express from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { fetchNewsFromSheet, saveNewsToSheet, deleteNewsFromSheet, type NewsItem } from '../news-utils.js'
import { logger } from '../logger.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (_req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const news = await fetchNewsFromSheet(sheetId)
    res.json({ news })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to load news')
    res.status(500).json({ error: 'failed_to_load_news' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const payload = Array.isArray(req.body?.news) ? req.body.news : []
    const normalized: NewsItem[] = payload
      .filter((item: any) => item && typeof item.title === 'string' && item.title.trim())
      .map((item: any, idx: number) => ({
        id: String(item.id || randomUUID()),
        title: String(item.title || '').trim().slice(0, 140),
        summary: String(item.summary || '').trim().slice(0, 1500) || undefined,
        imageUrl: String(item.imageUrl || '').trim() || undefined,
        publishedAt: String(item.publishedAt || '').trim() || undefined,
        active: item.active !== undefined ? Boolean(item.active) : true,
        sort: Number(item.sort ?? idx)
      }))
    await saveNewsToSheet(sheetId, normalized)
    res.json({ success: true, news: normalized })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to save news')
    res.status(500).json({ error: 'failed_to_save_news' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    await deleteNewsFromSheet(sheetId, req.params.id)
    res.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'news_not_found') return res.status(404).json({ error: 'news_not_found' })
    logger.error({ error: error?.message }, 'failed to delete news')
    res.status(500).json({ error: 'failed_to_delete_news' })
  }
})

export default router
