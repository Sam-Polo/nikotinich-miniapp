import express from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { fetchContentFromSheet, saveContentToSheet, computeReadMinutes, type ContentItem, type ContentItemType } from '../content-utils.js'
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
        const body = String(item.body || '').trim().slice(0, 2000) || undefined
        const readMinutes = item.readMinutes !== undefined && item.readMinutes !== null && item.readMinutes !== ''
          ? Number(item.readMinutes)
          : computeReadMinutes(body)
        const images = Array.isArray(item.images) ? item.images.map((x: any) => String(x).trim()).filter((x: string) => x.length > 0) : undefined
        return {
          id: String(item.id || randomUUID()),
          type,
          title: String(item.title || '').trim().slice(0, 140),
          body,
          imageUrl: String(item.imageUrl || '').trim() || undefined,
          images: images && images.length > 0 ? images : undefined,
          publishedAt: String(item.publishedAt || '').trim() || undefined,
          active: item.active !== undefined ? Boolean(item.active) : true,
          sort: Number(item.sort ?? idx),
          productSlugs: type === 'collection' && Array.isArray(item.productSlugs)
            ? item.productSlugs.map((x: any) => String(x).trim()).filter((x: string) => x.length > 0)
            : [],
          showInStories: Boolean(item.showInStories),
          readMinutes: readMinutes >= 1 ? readMinutes : undefined,
          likes: typeof item.likes === 'number' ? item.likes : (item.likes != null ? Number(item.likes) : 0),
          claps: typeof item.claps === 'number' ? item.claps : (item.claps != null ? Number(item.claps) : 0),
          dislikes: typeof item.dislikes === 'number' ? item.dislikes : (item.dislikes != null ? Number(item.dislikes) : 0)
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
