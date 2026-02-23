import type { Order } from './orders-utils.js'
import type { User } from './users-utils.js'
import type { OrdersSettings } from './settings-utils.js'
import { logger } from './logger.js'

const CONFIRMED_STATUSES = ['confirmed', 'packed', 'completed'] as const

/**
 * Начисляет реф. бонус рефереру при переходе заказа в статус "подтверждён".
 * Мутирует переданные массивы orders и users; сохранять в листы должен вызывающий код.
 */
export function accrueReferralBonusOnConfirmed(
  orderId: string,
  orders: Order[],
  users: User[],
  settings: OrdersSettings
): void {
  const orderIndex = orders.findIndex((o) => o.id === orderId)
  if (orderIndex === -1) return
  const order = orders[orderIndex]
  if (!order.userId) return
  if (order.referralBonusAccrued === true) return

  const buyer = users.find((u) => u.telegram_id === order.userId)
  if (!buyer?.referrer_id) return

  const referrerId = buyer.referrer_id
  const referrerIndex = users.findIndex((u) => u.telegram_id === referrerId)
  if (referrerIndex === -1) return

  // множество telegram_id пользователей, которых привёл этот реферер
  const referredUserIds = new Set(
    users.filter((u) => u.referrer_id === referrerId).map((u) => u.telegram_id)
  )

  const countConfirmedOrders = orders.filter(
    (o) =>
      o.userId &&
      referredUserIds.has(o.userId) &&
      (CONFIRMED_STATUSES as readonly string[]).includes(o.status)
  ).length

  const percent =
    countConfirmedOrders <= 10
      ? settings.referralPercentBefore10
      : settings.referralPercentAfter10
  const bonusRub = Math.round((order.totalRub * percent) / 100)
  if (bonusRub <= 0) return

  const referrer = users[referrerIndex]
  const newBalance = (referrer.referral_balance_rub ?? 0) + bonusRub
  users[referrerIndex] = { ...referrer, referral_balance_rub: newBalance }
  orders[orderIndex] = { ...order, referralBonusAccrued: true }

  logger.info(
    {
      orderId,
      referrerId,
      buyerId: order.userId,
      bonusRub,
      percent,
      newBalance
    },
    'реф. бонус начислен при подтверждении заказа'
  )
}
