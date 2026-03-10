import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { readSheet, ensureSheet, updateRange, appendRow } from '../sheets-utils.js'
import { logger } from '../logger.js'

const CONTENT_SHEET = 'content'
const REACTIONS_SHEET = 'content_reactions'
const REACTIONS_HEADERS = ['content_id', 'user_id', 'like', 'clap', 'dislike']

const router = Router()

function parseContentRow(header: string[], r: string[]) {
  const idx = (n: string) => header.indexOf(n)
  const get = (n: string) => String(r[idx(n)] ?? '').trim()
  const activeVal = get('active').toLowerCase()
  const active = activeVal === 'true' || activeVal === '1' || activeVal === 'yes'
  const productSlugsRaw = get('product_slugs')
  const productSlugs = productSlugsRaw ? productSlugsRaw.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : []
  const showInStoriesVal = get('show_in_stories').toLowerCase()
  const showInStories = showInStoriesVal === 'true' || showInStoriesVal === '1' || showInStoriesVal === 'yes'
  const imagesRaw = get('images')
  const images = imagesRaw ? imagesRaw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : undefined
  return {
    id: get('id'),
    type: get('type') as 'news' | 'collection',
    title: get('title'),
    body: get('body') || undefined,
    imageUrl: get('image_url') || undefined,
    images: images && images.length > 0 ? images : undefined,
    publishedAt: get('published_at') || undefined,
    active,
    sort: Number(get('sort')) || 0,
    productSlugs,
    showInStories,
    readMinutes: get('read_minutes') ? Number(get('read_minutes')) || undefined : undefined,
    likes: Number(get('likes')) || 0,
    claps: Number(get('claps')) || 0,
    dislikes: Number(get('dislikes')) || 0
  }
}

// GET /api/content — лента контента (новости + подборки), сортировка по полю sort
router.get('/', async (_req, res) => {
  try {
    const rows = await readSheet(SHEET_ID, `${CONTENT_SHEET}!A1:O500`)
    if (rows.length < 2) return res.json([])

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const needCols = ['id', 'type', 'title', 'body', 'image_url', 'published_at', 'active', 'sort', 'product_slugs', 'show_in_stories', 'images', 'read_minutes', 'likes', 'claps', 'dislikes']
    needCols.forEach((c) => { if (header.indexOf(c) < 0) header.push(c) })

    const items = rows
      .slice(1)
      .filter(r => r && r.length > 0)
      .map(r => parseContentRow(header, r))
      .filter(item => item.id && item.title && item.active)
      .sort((a, b) => a.sort - b.sort)

    res.json(items)
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка чтения контентной ленты')
    res.status(500).json({ error: 'server_error' })
  }
})

// POST /api/content/:id/react — поставить/снять реакцию (like, clap, dislike). дизлайк сбрасывает лайк и класс.
router.post('/:id/react', async (req, res) => {
  try {
    const contentId = req.params.id
    const { userId, reaction } = req.body || {}
    if (!userId || typeof userId !== 'string' || !['like', 'clap', 'dislike'].includes(reaction)) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    await ensureSheet(SHEET_ID, REACTIONS_SHEET, REACTIONS_HEADERS)

    const reactionRows = await readSheet(SHEET_ID, `${REACTIONS_SHEET}!A2:E5000`)
    let userRowIndex = -1
    let oldLike = 0, oldClap = 0, oldDislike = 0
    for (let i = 0; i < reactionRows.length; i++) {
      const row = reactionRows[i]
      if (String(row[0] || '').trim() === contentId && String(row[1] || '').trim() === String(userId)) {
        userRowIndex = i + 2
        oldLike = Number(row[2]) || 0
        oldClap = Number(row[3]) || 0
        oldDislike = Number(row[4]) || 0
        break
      }
    }

    let newLike = oldLike, newClap = oldClap, newDislike = oldDislike
    if (reaction === 'dislike') {
      newDislike = oldDislike ? 0 : 1
      newLike = 0
      newClap = 0
    } else if (reaction === 'like') {
      newLike = oldLike ? 0 : 1
      newDislike = 0
      // clap не трогаем
    } else if (reaction === 'clap') {
      newClap = oldClap ? 0 : 1
      newDislike = 0
    }

    if (userRowIndex > 0) {
      await updateRange(SHEET_ID, `${REACTIONS_SHEET}!C${userRowIndex}:E${userRowIndex}`, [[String(newLike), String(newClap), String(newDislike)]])
    } else {
      await appendRow(SHEET_ID, REACTIONS_SHEET, [contentId, userId, String(newLike), String(newClap), String(newDislike)])
    }

    // пересчёт сумм по content_id и обновление строки в content
    const contentReactionRows = await readSheet(SHEET_ID, `${REACTIONS_SHEET}!A2:E5000`)
    let likes = 0, claps = 0, dislikes = 0
    for (const row of contentReactionRows) {
      if (String(row[0] || '').trim() !== contentId) continue
      likes += Number(row[2]) || 0
      claps += Number(row[3]) || 0
      dislikes += Number(row[4]) || 0
    }

    const contentRows = await readSheet(SHEET_ID, `${CONTENT_SHEET}!A2:O500`)
    let contentRowIndex = -1
    for (let i = 0; i < contentRows.length; i++) {
      if (String(contentRows[i][0] || '').trim() === contentId) {
        contentRowIndex = i + 2
        break
      }
    }
    if (contentRowIndex > 0) {
      await updateRange(SHEET_ID, `${CONTENT_SHEET}!M${contentRowIndex}:O${contentRowIndex}`, [[String(likes), String(claps), String(dislikes)]])
    }

    res.json({
      likes,
      claps,
      dislikes,
      userReaction: { like: newLike, clap: newClap, dislike: newDislike }
    })
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка реакции контента')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
