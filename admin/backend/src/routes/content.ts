import express from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { fetchContentFromSheet, saveContentToSheet, type ContentItem, type ContentItemType } from '../content-utils.js'
import { logger } from '../logger.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (_req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const items = await fetchContentFromSheet(sheetId)
    res.json({ items })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to load content')
    res.status(500).json({ error: 'failed_to_load_content' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const payload = Array.isArray(req.body?.items) ? req.body.items : []
    const items: ContentItem[] = payload
      .filter((item: any) => item && typeof item.title === 'string' && item.title.trim())
      .map((item: any, idx: number) => {
        const type: ContentItemType = item.type === 'collection' ? 'collection' : 'news'
        return {
          id: String(item.id || randomUUID()),
          type,
          title: String(item.title || '').trim().slice(0, 140),
          body: String(item.body || '').trim().slice(0, 2000) || undefined,
          imageUrl: String(item.imageUrl || '').trim() || undefined,
          publishedAt: String(item.publishedAt || '').trim() || undefined,
          active: item.active !== undefined ? Boolean(item.active) : true,
          sort: Number(item.sort ?? idx),
          productSlugs: type === 'collection' && Array.isArray(item.productSlugs)
            ? item.productSlugs.map((x: any) => String(x).trim()).filter((x: string) => x.length > 0)
            : []
        }
      })
    await saveContentToSheet(sheetId, items)
    res.json({ success: true, items })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to save content')
    res.status(500).json({ error: 'failed_to_save_content' })
  }
})

export default router
