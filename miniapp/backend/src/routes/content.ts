import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { readSheet } from '../sheets-utils.js'
import { logger } from '../logger.js'

const router = Router()

// GET /api/content — лента контента (новости + подборки), сортировка по полю sort
router.get('/', async (_req, res) => {
  try {
    const rows = await readSheet(SHEET_ID, 'content!A1:J500')
    if (rows.length < 2) return res.json([])

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)

    const items = rows.slice(1)
      .filter(r => r && r.length > 0)
      .map(r => {
        const get = (n: string) => String(r[idx(n)] ?? '').trim()
        const activeVal = get('active').toLowerCase()
        const active = activeVal === 'true' || activeVal === '1' || activeVal === 'yes'

        const productSlugsRaw = get('product_slugs')
        const productSlugs = productSlugsRaw
          ? productSlugsRaw.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
          : []

        const showInStoriesVal = get('show_in_stories').toLowerCase()
        const showInStories = showInStoriesVal === 'true' || showInStoriesVal === '1' || showInStoriesVal === 'yes'

        return {
          id: get('id'),
          type: get('type') as 'news' | 'collection',
          title: get('title'),
          body: get('body') || undefined,
          imageUrl: get('image_url') || undefined,
          publishedAt: get('published_at') || undefined,
          active,
          sort: Number(get('sort')) || 0,
          productSlugs,
          showInStories
        }
      })
      .filter(item => item.id && item.title && item.active)
      .sort((a, b) => a.sort - b.sort)

    res.json(items)
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка чтения контентной ленты')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
