import { useMemo } from 'react'
import { formatTry } from '../../../data/index.js'
import { riskSeverityBadgeLabelTr } from '../../../mappers/risk/riskDrawerUi.js'
import { useOrders } from '../../../state/useOrders.js'
import { remainingBalance } from '../../../utils/orderFinance.js'
import { formatShortDate } from '../../../utils/dates.js'
import { formatCustomerIdentityCompact, formatCustomerPhonesCompact } from '../newOrderWizardModel.js'
import './order-customer-drawer.css'

/**
 * Genel Bakış — kompakt müşteri önizlemesi; detay sağ drawer’da.
 *
 * @param {{
 *   customer: string
 *   orderNo: string
 *   phone?: string | null
 *   phone2?: string | null
 *   address?: string | null
 *   salesPerson?: string | null
 *   orderDate?: string | null
 *   onOpenCustomerDrawer?: () => void
 * }} props
 */
export default function OrderPanelContactCard({
  customer,
  orderNo,
  phone,
  phone2,
  address,
  salesPerson,
  orderDate,
  onOpenCustomerDrawer,
}) {
  const { orders, salesOrderListItemDtos } = useOrders()

  const order = useMemo(() => orders.find((o) => o.id === orderNo) ?? null, [orders, orderNo])

  const listItemDto = useMemo(
    () =>
      salesOrderListItemDtos?.find((d) => d.id === orderNo || d.orderNumber === orderNo) ?? undefined,
    [salesOrderListItemDtos, orderNo],
  )

  const rem = useMemo(() => (order ? remainingBalance(order) : 0), [order])
  const riskLabel = riskSeverityBadgeLabelTr(listItemDto?.currentRiskSeverity ?? 'NONE')

  const lastCustomerOrder = useMemo(() => {
    const same = orders
      .filter((o) => o.customer?.trim() === customer.trim())
      .sort((a, b) => String(b.orderDate ?? '').localeCompare(String(a.orderDate ?? '')))
    const other = same.find((o) => o.id !== orderNo)
    return other ? `${other.id}${other.orderDate ? ` · ${formatShortDate(other.orderDate)}` : ''}` : '—'
  }, [orders, customer, orderNo])

  const phoneDisplay = formatCustomerPhonesCompact({ phone, phone2 }) || '—'
  const customerIdentity = order ? formatCustomerIdentityCompact(order) : null
  const addressText = address?.trim() || '—'

  return (
    <section className="cust-erp-preview" aria-labelledby="cust-preview-title">
      <div className="cust-erp-preview__head">
        <div>
          <h3 id="cust-preview-title" className="cust-erp-preview__title">
            {customer}
          </h3>
          <p className="cust-erp-preview__sub">
            {orderNo}
            {salesPerson?.trim() ? ` · ${salesPerson.trim()}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="cust-erp-preview__open"
          onClick={() => onOpenCustomerDrawer?.()}
        >
          Müşteri merkezi
        </button>
      </div>

      <dl className="cust-erp-preview__dl">
        <div className="cust-erp-preview__row">
          <dt>Telefon</dt>
          <dd>{phoneDisplay}</dd>
        </div>
        <div className="cust-erp-preview__row">
          <dt>Risk</dt>
          <dd>{riskLabel}</dd>
        </div>
        <div className="cust-erp-preview__row">
          <dt>Açık bakiye</dt>
          <dd>{rem > 0.009 ? formatTry(rem) : 'Kapandı'}</dd>
        </div>
        <div className="cust-erp-preview__row">
          <dt>Son sipariş</dt>
          <dd>{lastCustomerOrder}</dd>
        </div>
        <div className="cust-erp-preview__row">
          <dt>Adres</dt>
          <dd>{addressText}</dd>
        </div>
        <div className="cust-erp-preview__row">
          <dt>Sipariş tarihi</dt>
          <dd>{orderDate ?? '—'}</dd>
        </div>
        {customerIdentity ? (
          <div className="cust-erp-preview__row">
            <dt>Kimlik</dt>
            <dd>{customerIdentity}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
