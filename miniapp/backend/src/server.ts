import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { logger } from './logger.js'
import { PORT, appVersion, SHEET_ID } from './config.js'

const app = express()

// проверка обязательных env-переменных
if (!SHEET_ID) {
  logger.error('GOOGLE_SHEET_ID не задан — завершение')
  process.exit(1)
}

// CORS: разрешаем origins из переменной окружения
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // разрешаем запросы без origin (Telegram WebApp / curl) и из списка
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

app.use(express.json({ limit: '512kb' }))

// логирование входящих запросов
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'запрос')
  next()
})

// health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: appVersion })
})

// роуты
import catalogRoutes from './routes/catalog.js'
import contentRoutes from './routes/content.js'
import settingsRoutes from './routes/settings.js'
import ordersRoutes from './routes/orders.js'
import usersRoutes from './routes/users.js'
import visitsRoutes from './routes/visits.js'
import promocodesRoutes from './routes/promocodes.js'

app.use('/api/catalog', catalogRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/visits', visitsRoutes)
app.use('/api/promocodes', promocodesRoutes)

app.listen(PORT, () => {
  logger.info({ port: PORT, appVersion }, 'miniapp-backend запущен')
})
