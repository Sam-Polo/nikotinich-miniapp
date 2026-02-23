import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { logger } from './logger.js'
import path from 'node:path'
import { assertMediaConfig, mediaConfig, appVersion } from './media-config.js'

const app = express()
const PORT = process.env.PORT || 4001

assertMediaConfig()

// лог каждого входящего запроса (до разбора body) — чтобы видеть, доходят ли большие запросы до Node
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  const len = req.headers['content-length']
  logger.info({ method: req.method, url: req.url, contentLength: len ?? '—' }, 'входящий запрос')
  next()
})

// CORS настройка
const frontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174'
app.use(cors({
  origin: frontendUrl,
  credentials: true
}))

// ограничение размера JSON body для защиты от DoS
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(path.resolve(process.cwd(), mediaConfig.local.directory)))

// health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' })
})

// роуты
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/upload.js'
import promocodeRoutes from './routes/promocodes.js'
import settingsRoutes from './routes/settings.js'
import categoriesRoutes from './routes/categories.js'
import contentRoutes from './routes/content.js'
import ordersRoutes from './routes/orders.js'
import brandsRoutes from './routes/brands.js'
import linesRoutes from './routes/lines.js'
import usersRoutes from './routes/users.js'
import visitsRoutes from './routes/visits.js'
import analyticsRoutes from './routes/analytics.js'

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/promocodes', promocodeRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/brands', brandsRoutes)
app.use('/api/lines', linesRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/visits', visitsRoutes)
app.use('/api/analytics', analyticsRoutes)

app.listen(PORT, () => {
  logger.info({
    port: PORT,
    appVersion,
    mediaProvider: mediaConfig.provider
  }, 'админ-панель бэкенд запущен')
})

