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

export async function processImageBuffer(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: 'none' }).rotate()
  const metadata = await pipeline.metadata()
  const resized = metadata.width && metadata.width > mediaConfig.image.maxWidth
    ? pipeline.resize({ width: mediaConfig.image.maxWidth, withoutEnlargement: true })
    : pipeline

  const output = await resized
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
