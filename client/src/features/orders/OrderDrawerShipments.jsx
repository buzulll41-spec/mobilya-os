import { useCallback, useEffect, useState } from 'react'

import { SHIPMENT_OPERATION_STATUS } from '../../contracts/v1/shipmentStatuses.js'

import { getApiBaseUrl } from '../../config/dataSource.js'

import {

  pickShipmentFromMutationResult,

  sanitizeShipmentsList,

} from '../../mappers/shipment/normalizeShipmentDto.js'

import { shipmentStatusOrPlanned } from '../../mappers/shipment/shipmentStatusLabel.js'

import { applyShipmentStatusAdvance } from '../../mappers/shipment/applyShipmentStatusAdvance.js'
import { getShipmentFlowPresentation } from '../../mappers/shipment/shipmentOperationUx.js'

import * as ordersClient from '../../services/ordersClient.js'

import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'

import { formatShortDate } from '../../utils/dates.js'



/** @typedef {import('../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */

/** @typedef {import('../../contracts/v1/shipmentStatuses.js').ShipmentOperationStatus} ShipmentOperationStatus */



/**

 * @param {ShipmentDto[]} items

 * @param {ShipmentDto | null | undefined} updated

 */

function mergeShipment(items, updated) {

  if (!updated?.id) return sanitizeShipmentsList(items)

  const i = items.findIndex((s) => s?.id === updated.id)

  if (i === -1) return sanitizeShipmentsList([...items, updated])

  const next = [...items]

  next[i] = updated

  return sanitizeShipmentsList(next)

}



/**

 * @param {{

 *   orderId: string

 *   mutating: boolean

 *   openShipmentCount?: number

 *   onPostOrderShipment: (body: { plannedDate: string, crewName?: string, vehicleNote?: string, note?: string }) => Promise<{ shipment: ShipmentDto }>

 *   onPatchShipmentStatus: (shipmentId: string, body: { status: string, issueNote?: string }) => Promise<{ shipment: ShipmentDto }>

 * }} props

 */

export default function OrderDrawerShipments({

  orderId,

  mutating,

  openShipmentCount = 0,

  onPostOrderShipment,

  onPatchShipmentStatus,

}) {

  const [items, setItems] = useState(/** @type {ShipmentDto[]} */ ([]))

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState(/** @type {string | null} */ (null))

  const [formError, setFormError] = useState(/** @type {string | null} */ (null))

  const [statusSavingId, setStatusSavingId] = useState(/** @type {string | null} */ (null))

  const [plannedDate, setPlannedDate] = useState('')

  const [crewName, setCrewName] = useState('')

  const [vehicleNote, setVehicleNote] = useState('')

  const [note, setNote] = useState('')

  const [issueNoteForId, setIssueNoteForId] = useState(/** @type {string | null} */ (null))

  const [issueDraft, setIssueDraft] = useState('')

  const apiMode = Boolean(getApiBaseUrl())



  const loadItems = useCallback(

    async (/** @type {{ silent?: boolean }} */ opts = {}) => {

      if (!opts.silent) setLoading(true)

      else setRefreshing(true)

      setError(null)

      try {

        const rows = await ordersClient.getOrderShipments(orderId)

        setItems(sanitizeShipmentsList(rows))

      } catch (e) {

        setError(formatApiErrorMessage(e))

      } finally {

        if (!opts.silent) setLoading(false)

        else setRefreshing(false)

      }

    },

    [orderId],

  )



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drawer: fetch shipments on open
    void loadItems()
  }, [loadItems])



  async function handlePlan(e) {

    e.preventDefault()

    setFormError(null)

    if (!plannedDate.trim()) {

      setFormError('Plan tarihi zorunlu.')

      return

    }

    try {

      const postResult = await onPostOrderShipment({

        plannedDate: plannedDate.trim(),

        ...(crewName.trim() ? { crewName: crewName.trim() } : {}),

        ...(vehicleNote.trim() ? { vehicleNote: vehicleNote.trim() } : {}),

        ...(note.trim() ? { note: note.trim() } : {}),

      })

      const shipment = pickShipmentFromMutationResult(postResult)

      if (shipment) setItems((prev) => mergeShipment(prev, shipment))

      setPlannedDate('')

      setCrewName('')

      setVehicleNote('')

      setNote('')

      await loadItems({ silent: true })

    } catch (err) {

      setFormError(formatApiErrorMessage(err))

    }

  }



  /**

   * @param {ShipmentDto} item

   * @param {ShipmentOperationStatus} status

   */

  async function handleAdvance(item, action) {

    const status = typeof action === 'string' ? action : action.status

    const advanceChain = typeof action === 'object' ? action.advanceChain : undefined

    setFormError(null)

    if (status === SHIPMENT_OPERATION_STATUS.ISSUE) {

      const issueNote = issueDraft.trim()

      if (!issueNote) {

        setFormError('Sorun bildirimi için kısa bir not yazın.')

        return

      }

    }

    setStatusSavingId(item.id)

    try {

      const patchResult = await applyShipmentStatusAdvance(

        (_oid, sid, body) => onPatchShipmentStatus(sid, body),

        orderId,

        item.id,

        { status, advanceChain, issueNote: issueDraft },

      )

      const shipment = pickShipmentFromMutationResult(patchResult)

      if (shipment) setItems((prev) => mergeShipment(prev, shipment))

      setIssueNoteForId(null)

      setIssueDraft('')

      await loadItems({ silent: true })

    } catch (err) {

      setFormError(formatApiErrorMessage(err))

    } finally {

      setStatusSavingId(null)

    }

  }



  const listBusy = loading || refreshing



  return (

    <section className="mos-drawer-section" aria-labelledby={`shipment-op-${orderId}`}>

      <div className="mos-drawer-rowhead">

        <h3 className="mos-drawer-h" id={`shipment-op-${orderId}`}>

          Sevk / Montaj

        </h3>

        {openShipmentCount > 0 ? (

          <span className="mos-drawer-taskbadge">{openShipmentCount} açık sevk</span>

        ) : null}

      </div>



      {!apiMode ? (

        <p className="mos-drawer-op-meta" role="status">

          Mock mod: sevk kayıtları oturumda saklanır.

        </p>

      ) : null}



      {loading ? <p className="mos-drawer-p-meta">Sevk kayıtları yükleniyor…</p> : null}

      {refreshing ? (

        <p className="mos-drawer-p-meta" role="status">

          Liste güncelleniyor…

        </p>

      ) : null}

      {error ? (

        <p className="mos-drawer-op-error" role="alert">

          {error}

        </p>

      ) : null}



      {!loading && items.length === 0 ? (

        <p className="mos-drawer-p-meta">Henüz sevk yok. Aşağıdan planlayabilirsiniz.</p>

      ) : null}



      {items.length > 0 ? (

        <ul className="mos-drawer-missing-list" aria-busy={listBusy}>

          {items.map((item) => {

            if (!item?.id) return null

            const status = shipmentStatusOrPlanned(item.status)

            const flow = getShipmentFlowPresentation(status)

            const saving = statusSavingId === item.id || mutating

            const showIssueForm = issueNoteForId === item.id



            return (

              <li key={item.id} className="mos-drawer-missing-item">

                <p className="mos-drawer-p-strong">

                  {item.shipmentNumber || item.id}

                  {item.plannedShipDate ? (

                    <span className="mos-drawer-p-meta">

                      {' '}

                      · {formatShortDate(item.plannedShipDate)}

                    </span>

                  ) : null}

                </p>



                <div className="mos-shipment-flow" aria-live="polite">

                  <p className="mos-shipment-flow__line">

                    <span className="mos-shipment-flow__k">Şu an:</span>{' '}

                    {flow.currentLabel}

                  </p>

                  {flow.nextStepLabel && !flow.isTerminal ? (

                    <p className="mos-shipment-flow__line mos-shipment-flow__line--next">

                      <span className="mos-shipment-flow__k">Sıradaki adım:</span>{' '}

                      {flow.nextStepLabel}

                    </p>

                  ) : null}

                  {flow.isTerminal && flow.terminalMessage ? (

                    <p className="mos-drawer-p-meta">{flow.terminalMessage}</p>

                  ) : null}

                </div>



                {item.crewName ? (

                  <p className="mos-drawer-p-meta">Ekip: {item.crewName}</p>

                ) : null}

                {item.vehicleNote ? (

                  <p className="mos-drawer-p-meta">Araç: {item.vehicleNote}</p>

                ) : null}



                {!flow.isTerminal ? (

                  <div className="mos-drawer-missing-actions">

                    {flow.primaryAction ? (

                      <button

                        type="button"

                        className="mos-btn mos-btn--sm"

                        disabled={saving}

                        onClick={() => void handleAdvance(item, flow.primaryAction)}

                      >

                        {flow.primaryAction.label}

                      </button>

                    ) : null}



                    {flow.deliveredChoices.length > 0 ? (

                      <div className="mos-shipment-delivered-choices">

                        {flow.deliveredChoices.map((choice) =>

                          choice.needsNote && showIssueForm ? (

                            <div key={choice.status} className="mos-shipment-issue-form">

                              <label className="mos-drawer-field mos-drawer-field--compact">

                                <span className="mos-drawer-field-label">Sorun notu</span>

                                <input

                                  type="text"

                                  className="mos-input"

                                  value={issueDraft}

                                  onChange={(e) => setIssueDraft(e.target.value)}

                                  disabled={saving}

                                  maxLength={300}

                                  placeholder="Kısaca ne oldu?"

                                />

                              </label>

                              <div className="mos-shipment-delivered-choices__row">

                                <button

                                  type="button"

                                  className="mos-btn mos-btn--sm mos-btn--ghost"

                                  disabled={saving}

                                  onClick={() => {

                                    setIssueNoteForId(null)

                                    setIssueDraft('')

                                  }}

                                >

                                  Vazgeç

                                </button>

                                <button

                                  type="button"

                                  className="mos-btn mos-btn--sm"

                                  disabled={saving}

                                  onClick={() => void handleAdvance(item, choice.status)}

                                >

                                  {choice.label}

                                </button>

                              </div>

                            </div>

                          ) : (

                            <button

                              key={choice.status}

                              type="button"

                              className={

                                choice.needsNote

                                  ? 'mos-btn mos-btn--sm mos-btn--ghost'

                                  : 'mos-btn mos-btn--sm'

                              }

                              disabled={saving}

                              onClick={() => {

                                if (choice.needsNote) {

                                  setIssueNoteForId(item.id)

                                  setIssueDraft('')

                                  return

                                }

                                void handleAdvance(item, choice.status)

                              }}

                            >

                              {choice.label}

                            </button>

                          ),

                        )}

                      </div>

                    ) : null}

                  </div>

                ) : null}

              </li>

            )

          })}

        </ul>

      ) : null}



      <form className="mos-drawer-op-form" onSubmit={(e) => void handlePlan(e)}>

        <p className="mos-drawer-op-kicker">Yeni sevk planla</p>

        <label className="mos-drawer-field mos-drawer-field--compact">

          <span className="mos-drawer-field-label">Plan tarihi</span>

          <input

            type="date"

            className="mos-input"

            value={plannedDate}

            onChange={(e) => setPlannedDate(e.target.value)}

            disabled={mutating}

          />

        </label>

        <label className="mos-drawer-field mos-drawer-field--compact">

          <span className="mos-drawer-field-label">Montaj ekibi (isteğe bağlı)</span>

          <input

            type="text"

            className="mos-input"

            value={crewName}

            onChange={(e) => setCrewName(e.target.value)}

            disabled={mutating}

            maxLength={120}

          />

        </label>

        <label className="mos-drawer-field mos-drawer-field--compact">

          <span className="mos-drawer-field-label">Araç notu (isteğe bağlı)</span>

          <input

            type="text"

            className="mos-input"

            value={vehicleNote}

            onChange={(e) => setVehicleNote(e.target.value)}

            disabled={mutating}

            maxLength={200}

          />

        </label>

        <label className="mos-drawer-field mos-drawer-field--compact">

          <span className="mos-drawer-field-label">Operasyon notu (isteğe bağlı)</span>

          <input

            type="text"

            className="mos-input"

            value={note}

            onChange={(e) => setNote(e.target.value)}

            disabled={mutating}

            maxLength={500}

          />

        </label>

        <button type="submit" className="mos-btn mos-btn--sm" disabled={mutating}>

          Sevk planla

        </button>

        {formError ? (

          <p className="mos-drawer-op-error" role="alert">

            {formError}

          </p>

        ) : null}

      </form>

    </section>

  )

}


