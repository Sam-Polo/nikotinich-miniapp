import sharp from 'sharp'
import { mediaConfig } from './media-config.js'

export type ProcessedImage = {
  buffer: Buffer
  contentType: 'image/webp'
  extension: 'webp'
  width: number
  height: number
  sizeBytes: number
}

const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export function isAllowedImageMime(mimeType: string): boolean {
  return allowedMimeTypes.has(mimeType.trim().toLowerCase())
}

export type ProcessImageOptions = {
  cropToSquare?: boolean
}

export async function processImageBuffer(input: Buffer, options?: ProcessImageOptions): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: 'none' }).rotate()
  let current = pipeline
  const metadata = await pipeline.metadata()
  if (metadata.width && metadata.width > mediaConfig.image.maxWidth) {
    current = current.resize({ width: mediaConfig.image.maxWidth, withoutEnlargement: true })
  }
  if (options?.cropToSquare) {
    const meta = await current.metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const size = Math.min(w, h, mediaConfig.image.maxWidth)
    if (size > 0) {
      current = current.resize({ width: size, height: size, fit: 'cover', position: 'center' })
    }
  }
  const output = await current
    .webp({ quality: mediaConfig.image.webpQuality })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: output.data,
    contentType: 'image/webp',
    extension: 'webp',
    width: output.info.width,
    height: output.info.height,
    sizeBytes: output.info.size
  }
}
