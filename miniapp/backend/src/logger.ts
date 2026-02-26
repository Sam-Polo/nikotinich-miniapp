import pino from 'pino'
import { appVersion } from './config.js'

function mskTime(): string {
  return new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
}

const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  base: { appVersion },
  timestamp: () => `,"time":"${mskTime()}"`,
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: false, ignore: 'pid,hostname' }
      }
}

export const logger = pino(pinoOptions)
