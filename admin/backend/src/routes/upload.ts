import express from 'express'
import multer from 'multer'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { processImageBuffer, isAllowedImageMime } from '../image-processor.js'
import { uploadPublicMedia } from '../media-storage.js'
import { mediaConfig } from '../media-config.js'

const router = express.Router()

// все роуты требуют авторизации
router.use(requireAuth)

const MAX_FILE_SIZE = mediaConfig.image.maxUploadBytes

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (isAllowedImageMime(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Разрешены только изображения: JPG, PNG, WebP'))
    }
  }
})

// загрузка фото в S3/local + обработка ошибок multer
router.post(
  '/',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('POST /api/upload — запрос получен, ожидаем тело с файлом')
    next()
  },
  upload.single('file'),
  async (req: express.Request, res: express.Response) => {
    try {
      if (!req.file) {
        logger.warn('запрос без файла или поле не "file"')
        return res.status(400).json({ error: 'файл не загружен' })
      }

      const processed = await processImageBuffer(req.file.buffer)
      const uploadResult = await uploadPublicMedia(
        processed.buffer,
        req.file.originalname,
        processed.contentType,
        processed.extension
      )

      res.json({
        url: uploadResult.url,
        key: uploadResult.key,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.sizeBytes,
        format: processed.extension
      })
    } catch (error: any) {
      const errMsg = error?.message
      const errResponse = error?.response
      logger.error({
        error: errMsg,
        code: error?.code,
        status: errResponse?.status,
        data: errResponse?.data,
        stack: error?.stack
      }, 'ошибка загрузки изображения')
      res.status(500).json({ error: errMsg || 'failed_to_upload' })
    }
  },
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        logger.warn({ limit: MAX_FILE_SIZE }, 'загрузка фото: превышен размер файла')
        return res.status(400).json({ error: 'file_too_large' })
      }
      logger.error({ code: err.code, message: err.message }, 'ошибка multer при загрузке')
      return res.status(400).json({ error: err.message || 'upload_failed' })
    }
    if (err) {
      logger.error({ error: err?.message, name: err?.name }, 'ошибка при загрузке фото (fileFilter или multer)')
      return res.status(400).json({ error: err?.message || 'upload_failed' })
    }
  }
)

export default router

