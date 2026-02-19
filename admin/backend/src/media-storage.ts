import path from 'node:path'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { mediaConfig } from './media-config.js'
import { logger } from './logger.js'

export type MediaUploadResult = {
  key: string
  url: string
}

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: mediaConfig.s3.region,
      endpoint: mediaConfig.s3.endpoint,
      forcePathStyle: mediaConfig.s3.forcePathStyle,
      credentials: {
        accessKeyId: mediaConfig.s3.accessKeyId,
        secretAccessKey: mediaConfig.s3.secretAccessKey
      }
    })
  }
  return s3Client
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function buildObjectKey(originalName: string, extension: string): string {
  const safeName = path.basename(originalName, path.extname(originalName)).toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const suffix = safeName || 'image'
  return `${mediaConfig.objectPrefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${suffix}.${extension}`
}

async function uploadToLocal(buffer: Buffer, key: string): Promise<MediaUploadResult> {
  const localRoot = path.resolve(process.cwd(), mediaConfig.local.directory)
  const targetPath = path.resolve(localRoot, key)
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, buffer)
  const url = `${trimSlash(mediaConfig.local.publicBaseUrl)}/${key}`
  return { key, url }
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<MediaUploadResult> {
  const client = getS3Client()
  await client.send(new PutObjectCommand({
    Bucket: mediaConfig.s3.publicBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType
  }))

  const baseUrl = mediaConfig.s3.publicBaseUrl
  const url = baseUrl
    ? `${trimSlash(baseUrl)}/${key}`
    : `${trimSlash(mediaConfig.s3.endpoint)}/${mediaConfig.s3.publicBucket}/${key}`

  return { key, url }
}

export async function uploadPublicMedia(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  extension: string
): Promise<MediaUploadResult> {
  const key = buildObjectKey(originalName, extension)
  if (mediaConfig.provider === 's3') {
    const uploaded = await uploadToS3(buffer, key, contentType)
    logger.info({ key: uploaded.key }, 'media uploaded to s3')
    return uploaded
  }

  const uploaded = await uploadToLocal(buffer, key)
  logger.info({ key: uploaded.key }, 'media uploaded to local storage')
  return uploaded
}
