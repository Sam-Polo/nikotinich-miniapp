type MediaProvider = 's3' | 'local'

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export const appVersion = process.env.APP_VERSION || process.env.npm_package_version || 'dev'

export const mediaConfig = {
  provider: (process.env.MEDIA_PROVIDER || 'local').trim().toLowerCase() as MediaProvider,
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'ru-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    forcePathStyle: toBool(process.env.S3_FORCE_PATH_STYLE, true),
    publicBucket: process.env.S3_PUBLIC_BUCKET || '',
    privateBucket: process.env.S3_PRIVATE_BUCKET || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || ''
  },
  local: {
    directory: process.env.MEDIA_LOCAL_DIR || 'uploads',
    publicBaseUrl: process.env.MEDIA_LOCAL_PUBLIC_BASE_URL || 'http://localhost:4001/uploads'
  },
  image: {
    maxUploadBytes: 10 * 1024 * 1024,
    maxWidth: Number(process.env.IMAGE_MAX_WIDTH || '1600'),
    webpQuality: Number(process.env.IMAGE_WEBP_QUALITY || '82')
  },
  objectPrefix: process.env.MEDIA_OBJECT_PREFIX || 'dev/products'
}

export function assertMediaConfig(): void {
  if (mediaConfig.provider === 's3') {
    const required = [
      ['S3_ENDPOINT', mediaConfig.s3.endpoint],
      ['S3_ACCESS_KEY_ID', mediaConfig.s3.accessKeyId],
      ['S3_SECRET_ACCESS_KEY', mediaConfig.s3.secretAccessKey],
      ['S3_PUBLIC_BUCKET', mediaConfig.s3.publicBucket]
    ]
    const missing = required.filter(([, value]) => !value).map(([name]) => name)
    if (missing.length > 0) {
      throw new Error(`missing_s3_env: ${missing.join(', ')}`)
    }
  }
}
