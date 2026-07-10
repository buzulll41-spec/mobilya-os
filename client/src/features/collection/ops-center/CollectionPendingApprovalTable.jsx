import { useState } from 'react'
import { useAuth } from '../../../state/AuthProvider.jsx'
import { canApprovePayments } from '../../../lib/paymentApprovalPolicy.js'
import { formatApiErrorMessage } from '../../../utils/apiErrorMessage.js'
import * as ordersClient from '../../../services/ordersClient.js'
import MosButton from '../../../components/MosButton.jsx'

/** @typedef {import('../../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow} PendingApprovalQueueRow */

/**
 * @param {{
 *   rows: PendingApprovalQueueRow[]
 *   mutating?: boolean
 *   onChanged?: () => void
 * }} props
 */
export default function CollectionPendingApprovalTable({ rows, mutating = false, onChanged }) {
  const { user } = useAuth()
  const canApprove = canApprovePayments(user?.role)
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))

  async function handleApprove(row) {
    setActionError(null)
    try {
      await ordersClient.approveOrderPayment(row.orderId, row.paymentId, {
        approvalNote: 'Tahsilat onaylandı',
      })
      onChanged?.()
    } catch (err) {
      setActionError(formatApiErrorMessage(err))
    }
  }

  async function handleReject(row) {
    const note = window.prompt('Red sebebini yazın (zorunlu):')
    if (!note?.trim()) {
      setActionError('Red sebebi zorunludur.')
      return
    }
    setActionError(null)
    try {
      await ordersClient.rejectOrderPayment(row.orderId, row.paymentId, { rejectionNote: note.trim() })
      onChanged?.()
    } catch (err) {
      setActionError(formatApiErrorMessage(err))
    }
  }

  return (
    <div className="coll-pending-approval">
      {actionError ? (
        <p className="coll-pending-approval__error" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="mos-erp-tbl-wrap">
        <table className="mos-erp-tbl coll-pending-approval__table">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Sipariş no</th>
              <th className="is-num">Tutar</th>
              <th>Ödeme yöntemi</th>
              <th>Tedarikçi</th>
              <th>Girişi yapan</th>
              <th>Tarih</th>
              <th>Açıklama</th>
              {canApprove ? <th className="is-ops">İşlem</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="mos-erp-tbl-empty">
                <td colSpan={canApprove ? 9 : 8}>Onay bekleyen tahsilat yok.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.paymentId}
                  className={`mos-erp-tbl-row coll-pending-approval__row coll-pending-approval__row--${row.ageTier}`}
                  title={row.ageHint ?? undefined}
                >
                  <td>{row.customer}</td>
                  <td>{row.orderNo}</td>
                  <td className="is-num">{row.amountLabel}</td>
                  <td>{row.methodLabel}</td>
                  <td>{row.supplierLabel}</td>
                  <td>{row.actorLabel}</td>
                  <td>{row.dateLabel}</td>
                  <td>{row.description}</td>
                  {canApprove ? (
                    <td className="is-ops">
                      <div className="coll-pending-approval__ops">
                        <MosButton
                          context="table"
                          tone="success"
                          label="Onayla"
                          disabled={mutating}
                          onClick={() => void handleApprove(row)}
                        />
                        <MosButton
                          context="table"
                          tone="danger"
                          label="Reddet"
                          disabled={mutating}
                          onClick={() => void handleReject(row)}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
