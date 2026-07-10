import { formatTry } from '../../data/index.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { parseOrderProductSummary } from '../../utils/orderProductSummary.js'
import {
  orderStatusStripeSlug,
  paymentCollectionPercent,
  paymentCollectionTone,
  terminDelayDays,
} from '../../utils/orderCardUi.js'
import { useShipmentPlans } from '../../hooks/useShipmentPlans.jsx'
import { buildShipmentPlanCardLine } from '../../mappers/shipment-ops/shipmentPlanningCenterModel.js'
import StatusBadge from '../StatusBadge.jsx'
import OrderOperationCardMenu from './OrderOperationCardMenu.jsx'

/** @typedef {import('../../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {'detail' | 'payment' | 'shipment' | 'contract'} OrderCardQuickAction */

/**
 * @param {OrderListRowVM} order
 * @returns {'ok' | 'warn' | 'high'}
 */
function remainingBalanceTone(order) {
  const remaining = remainingBalance(order)
  const total = order.amount ?? 0
  if (remaining <= 0.009) return 'ok'
  if (total > 0 && remaining / total >= 0.45) return 'high'
  return 'warn'
}

/**
 * @param {number} percent
 */
function progressBarBlocks(percent) {
  const filled = Math.round(Math.min(10, Math.max(0, percent / 10)))
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`
}

/**
 * @param {{
 *   orders: OrderListRowVM[]
 *   todayIso?: string
 *   onOrderSelect?: (order: OrderListRowVM) => void
 *   onQuickAction?: (order: OrderListRowVM, action: OrderCardQuickAction) => void
 * }} props
 */
export default function OrderOperationCardList({ orders, todayIso, onOrderSelect, onQuickAction }) {
  const { plansByOrderId } = useShipmentPlans()

  if (!orders.length) {
    return <p className="mos-empty mos-order-op-empty">Bu görünümde kayıt yok.</p>
  }

  return (
    <div className="mos-order-op-list" role="list">
      {orders.map((order) => {
        const summary = parseOrderProductSummary(order.product)
        const remaining = remainingBalance(order)
        const remainingTone = remainingBalanceTone(order)
        const orderNo = order.orderNumber ?? order.id
        const stripeSlug = orderStatusStripeSlug(order.status)
        const delayDays =
          order.status !== 'Teslim Edildi' ? terminDelayDays(order.dueDate, todayIso) : 0
        const terminOverdue = delayDays > 0
        const collectionPct = paymentCollectionPercent(order)
        const collectionTone = paymentCollectionTone(collectionPct)
        const shipmentPlanLine = buildShipmentPlanCardLine(plansByOrderId.get(order.id))

        return (
          <article
            key={order.id}
            role="listitem"
            className={`mos-order-op-card mos-order-op-card--stripe-${stripeSlug}${terminOverdue ? ' mos-order-op-card--delayed' : ''}`}
            tabIndex={onOrderSelect ? 0 : undefined}
            onClick={onOrderSelect ? () => onOrderSelect(order) : undefined}
            onKeyDown={
              onOrderSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOrderSelect(order)
                    }
                  }
                : undefined
            }
          >
            <span className="mos-order-op-card__stripe" aria-hidden />

            {onQuickAction ? (
              <OrderOperationCardMenu
                orderId={order.id}
                onAction={(action) => onQuickAction(order, action)}
              />
            ) : null}

            <div className="mos-order-op-card__identity">
              <h3 className="mos-order-op-card__customer">{order.customer}</h3>
              <p className="mos-order-op-card__meta mos-mono">{orderNo}</p>
              <p className="mos-order-op-card__meta">
                {order.phone?.trim() ? order.phone : 'Telefon: —'}
              </p>
            </div>

            <div className="mos-order-op-card__product">
              <p className="mos-order-op-card__product-head">
                <span className="mos-order-op-card__product-icon" aria-hidden>
                  📦
                </span>
                {summary.displayCount > 0 ? `${summary.displayCount} Ürün` : 'Ürün yok'}
              </p>
              {summary.visibleTitles.map((title, index) => (
                <p key={`${order.id}-product-${index}`} className="mos-order-op-card__product-name" title={title}>
                  {title}
                </p>
              ))}
              {summary.hiddenLineCount > 0 ? (
                <p className="mos-order-op-card__product-more">+{summary.hiddenLineCount} ürün daha</p>
              ) : null}
            </div>

            <div className="mos-order-op-card__ops">
              <StatusBadge status={order.status} />
              <p className="mos-order-op-card__ops-line">
                Termin:{' '}
                <span className={terminOverdue ? 'mos-order-op-card__ops-line--overdue' : undefined}>
                  {formatShortDate(order.dueDate)}
                </span>
              </p>
              {terminOverdue ? (
                <p className="mos-order-op-card__delay-alarm">
                  <span aria-hidden>🔴</span> {delayDays} gün gecikti
                </p>
              ) : null}
              <p className="mos-order-op-card__ops-line">
                Sevk: {shipmentPlanLine ?? formatShortDate(order.shipmentDate) ?? '—'}
              </p>
            </div>

            <div className="mos-order-op-card__finance">
              <p className="mos-order-op-card__total">{formatTry(order.amount)} toplam</p>
              <p className={`mos-order-op-card__remaining mos-order-op-card__remaining--${remainingTone}`}>
                {formatTry(remaining)} kalan
              </p>
              <div className={`mos-order-op-card__progress mos-order-op-card__progress--${collectionTone}`}>
                <span className="mos-order-op-card__progress-label">
                  Tahsilat %{Math.round(collectionPct)}
                </span>
                <span className="mos-order-op-card__progress-bar" aria-hidden>
                  {progressBarBlocks(collectionPct)}
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
