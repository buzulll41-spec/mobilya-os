import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'

import DigitalWorkforceCard from '../features/digital-workforce/DigitalWorkforceCard.jsx'

import DigitalWorkforceDrawer from '../features/digital-workforce/DigitalWorkforceDrawer.jsx'

import {

  buildDigitalWorkforceExperienceHub,

  buildDigitalWorkerExperienceDetailVm,

  buildDigitalWorkforceTaskHintsFromEngine,

} from '../mappers/digital-workforce/digitalWorkforceModel.js'

import { buildDigitalWorkforceHash, parseDigitalWorkforceWorkerFromHash } from '../mappers/digital-workforce/digitalWorkforceExperience.js'

import {

  getDigitalWorkforceSnapshot,

  getDigitalWorkerDetail,

  subscribeDigitalWorkforceStore,

} from '../services/digitalWorkforceClient.js'

import { useLivingDigitalWorkforce } from '../hooks/useLivingDigitalWorkforce.js'
import { useAiEmployeeActivity } from '../hooks/useAiEmployeeActivity.js'
import AiActivityPanel from '../features/digital-workforce/AiActivityPanel.jsx'
import OperationFeedPanel from '../features/digital-workforce/OperationFeedPanel.jsx'
import { buildAiActivityPanelRows, enrichCardWithEmployeeActivity } from '../mappers/digital-workforce/aiEmployeeActivityModel.js'
import { buildCompanyManagerHubExtras } from '../mappers/digital-workforce/companyManagerModel.js'
import { buildCompanyBrainHubExtras } from '../mappers/digital-workforce/companyBrainModel.js'
import { subscribeCompanyManagerStore } from '../services/company-manager/companyManagerStore.js'
import { subscribeCompanyBrainStore } from '../services/company-brain/companyBrainStore.js'
import AiCompanyStatusPanel from '../features/digital-workforce/AiCompanyStatusPanel.jsx'
import LiveCompanyMap from '../features/digital-workforce/LiveCompanyMap.jsx'
import CompanyGoalsPanel from '../features/digital-workforce/CompanyGoalsPanel.jsx'
import AiDecisionLogPanel from '../features/digital-workforce/AiDecisionLogPanel.jsx'
import CompanyManagerCard from '../features/digital-workforce/CompanyManagerCard.jsx'

import { initialOrders } from '../data/seedOrders.js'

import { projectLegacyOrderToListItemDto } from '../services/orderListItemProjection.js'

import { DEMO_TODAY } from '../data/constants.js'

import '../styles/mos-erp-ops.css'

import '../styles/digital-workforce.css'



/**

 * @param {{ initialWorkerId?: string | null }} props

 */

export default function DigitalWorkforcePage({ initialWorkerId = null }) {

  const [snapshot, setSnapshot] = useState(

    /** @type {import('../services/mockDigitalWorkforceStore.js').ReturnType<import('../services/mockDigitalWorkforceStore.js').getDigitalWorkforceCoreSnapshot> | null} */ (

      null

    ),

  )

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(/** @type {string | null} */ (null))

  const [selectedWorkerId, setSelectedWorkerId] = useState(/** @type {string | null} */ (initialWorkerId))

  const [detail, setDetail] = useState(

    /** @type {ReturnType<typeof buildDigitalWorkerExperienceDetailVm> | null} */ (null),

  )

  const [detailLoading, setDetailLoading] = useState(false)

  const [glowWorkerIds, setGlowWorkerIds] = useState(/** @type {Set<string>} */ (new Set()))

  const [successWorkerIds, setSuccessWorkerIds] = useState(/** @type {Set<string>} */ (new Set()))

  const prevPendingRef = useRef(/** @type {Record<string, number>} */ ({}))

  const prevCompletedRef = useRef(/** @type {Record<string, number>} */ ({}))



  const { engine, livingMap } = useLivingDigitalWorkforce(snapshot)
  const { version: employeeActivityVersion } = useAiEmployeeActivity()
  const [companyManagerVersion, setCompanyManagerVersion] = useState(0)
  const [companyBrainVersion, setCompanyBrainVersion] = useState(0)



  const engineHints = useMemo(() => {

    const orders = initialOrders.filter((o) => o.status !== 'İptal')

    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

    return buildDigitalWorkforceTaskHintsFromEngine(orders, dtos, DEMO_TODAY)

  }, [snapshot])



  const load = useCallback(() => {

    setError(null)

    return getDigitalWorkforceSnapshot()

      .then((res) => {

        setSnapshot(res)

        setLoading(false)

      })

      .catch((err) => {

        setError(err?.message ?? 'Digital Workforce yüklenemedi')

        setLoading(false)

      })

  }, [])



  const detectLiveEffects = useCallback((nextSnapshot) => {

    const nextPending = /** @type {Record<string, number>} */ ({})

    const nextCompleted = /** @type {Record<string, number>} */ ({})

    for (const worker of nextSnapshot.workers) {

      const pending = nextSnapshot.tasks.filter(

        (t) =>

          t.workerId === worker.id &&

          (t.status === 'WAITING' || t.status === 'RUNNING' || t.status === 'HUMAN_APPROVAL'),

      ).length

      const completed =

        nextSnapshot.tasks.filter((t) => t.workerId === worker.id && t.status === 'COMPLETED').length +

        nextSnapshot.taskHistory.filter((h) => h.workerId === worker.id).length

      nextPending[worker.id] = pending

      nextCompleted[worker.id] = completed



      const prevPending = prevPendingRef.current[worker.id] ?? 0

      const prevCompleted = prevCompletedRef.current[worker.id] ?? 0



      if (pending > prevPending) {

        setGlowWorkerIds((prev) => new Set(prev).add(worker.id))

        window.setTimeout(() => {

          setGlowWorkerIds((prev) => {

            const copy = new Set(prev)

            copy.delete(worker.id)

            return copy

          })

        }, 1800)

      }



      if (completed > prevCompleted) {

        setSuccessWorkerIds((prev) => new Set(prev).add(worker.id))

        window.setTimeout(() => {

          setSuccessWorkerIds((prev) => {

            const copy = new Set(prev)

            copy.delete(worker.id)

            return copy

          })

        }, 2200)

      }

    }

    prevPendingRef.current = nextPending

    prevCompletedRef.current = nextCompleted

  }, [])



  useEffect(() => {
    const bump = () => setCompanyManagerVersion((v) => v + 1)
    return subscribeCompanyManagerStore(bump)
  }, [])

  useEffect(() => {
    const bump = () => setCompanyBrainVersion((v) => v + 1)
    return subscribeCompanyBrainStore(bump)
  }, [])



  useEffect(() => {

    let alive = true

    load().then(() => {

      if (!alive) return

    })

    const unsubscribe = subscribeDigitalWorkforceStore(() => {

      getDigitalWorkforceSnapshot().then((res) => {

        if (!alive) return

        detectLiveEffects(res)

        setSnapshot(res)

      })

    })

    return () => {

      alive = false

      unsubscribe()

    }

  }, [load, detectLiveEffects])



  useEffect(() => {

    const fromHash = parseDigitalWorkforceWorkerFromHash(window.location.hash)

    if (fromHash) setSelectedWorkerId(fromHash)

  }, [])



  useEffect(() => {

    if (initialWorkerId) setSelectedWorkerId(initialWorkerId)

  }, [initialWorkerId])



  useEffect(() => {

    if (!selectedWorkerId) {

      setDetail(null)

      window.history.replaceState(null, '', buildDigitalWorkforceHash(null))

      return undefined

    }

    window.history.replaceState(null, '', buildDigitalWorkforceHash(selectedWorkerId))

    let alive = true

    setDetailLoading(true)

    getDigitalWorkerDetail(selectedWorkerId)

      .then((res) => {

        if (!alive) return

        setDetail(

          buildDigitalWorkerExperienceDetailVm(

            res.worker,

            res.tasks,

            res.taskHistory,

            res.performance,

            engineHints,

          ),

        )

        setDetailLoading(false)

      })

      .catch((err) => {

        if (!alive) return

        setError(err?.message ?? 'Detay yüklenemedi')

        setDetailLoading(false)

      })

    return () => {

      alive = false

    }

  }, [selectedWorkerId, snapshot, engineHints])



  const hub = useMemo(() => {

    if (!snapshot) return null

    const base = buildDigitalWorkforceExperienceHub(

      snapshot.workers,

      snapshot.tasks,

      snapshot.performance,

      snapshot.taskHistory,

      engineHints,

    )

    const liveKpis = engine.overlayLiveKpis(base.kpis, livingMap)

    const liveCards = base.cards.map((card) => {
      const enriched = engine.enrichCard(card, livingMap[card.id])
      return enrichCardWithEmployeeActivity(enriched, card.id)
    })

    const managerExtras = buildCompanyManagerHubExtras(
      snapshot.workers,
      snapshot.tasks,
      snapshot.taskHistory,
      snapshot.performance,
    )
    const brainExtras = buildCompanyBrainHubExtras()

    return {
      ...base,
      kpis: liveKpis,
      cards: liveCards,
      ...managerExtras,
      ...brainExtras,
    }

  }, [snapshot, engineHints, engine, livingMap, employeeActivityVersion, companyManagerVersion, companyBrainVersion])



  const aiActivityRows = useMemo(() => buildAiActivityPanelRows(), [employeeActivityVersion, snapshot])



  const liveDetail = useMemo(() => {

    if (!detail || !selectedWorkerId) return null

    const enriched = engine.enrichDetail(detail, livingMap[selectedWorkerId])

    return enrichCardWithEmployeeActivity(enriched, selectedWorkerId)

  }, [detail, selectedWorkerId, engine, livingMap, employeeActivityVersion])



  const openWorker = useCallback((workerId) => {

    setSelectedWorkerId(workerId)

  }, [])



  const closeDrawer = useCallback(() => {

    setSelectedWorkerId(null)

  }, [])



  return (

    <div className="mos-page mos-erp-ops dw-page dw-page--experience dw-page--living">

      <header className="mos-erp-ops__head">

        <div className="mos-erp-ops__head-copy">

          <h1 className="mos-erp-ops__title">Digital Workforce</h1>

          <span className="mos-erp-ops__sub">

            Living Digital Workforce · Autonomous AI Company (FAZ 47)

          </span>

        </div>

      </header>



      {loading && (

        <div className="mos-erp-detail mos-erp-detail--empty">

          <span className="mos-erp-detail__empty">Yükleniyor…</span>

        </div>

      )}

      {!loading && error && (

        <div className="mos-erp-detail mos-erp-detail--empty">

          <span className="mos-erp-detail__empty">{error}</span>

        </div>

      )}



      {!loading && !error && hub && (

        <>

          <ErpOpsSummaryStrip

            metrics={hub.kpis}

            ariaLabel="Digital Workforce canlı özeti"

            summaryClassName="mos-erp-summary--cols-5 dw-summary--living"

          />



          <AiCompanyStatusPanel metrics={hub.aiCompanyStatusKpis ?? hub.companyStatusKpis ?? []} />

          <LiveCompanyMap map={hub.liveCompanyMap ?? { workers: [], edges: [], centerLabel: 'Company Brain' }} />

          <CompanyGoalsPanel goals={hub.companyGoals ?? []} editable />

          <AiDecisionLogPanel items={hub.aiDecisionLog ?? []} />

          {hub.companyManagerCard ? (
            <section className="mos-erp-cockpit-section" aria-label="Company Manager">
              <h2 className="mos-erp-cockpit-section__title">Company Manager</h2>
              <div className="dw-grid dw-grid--manager">
                <CompanyManagerCard card={hub.companyManagerCard} onOpen={openWorker} />
              </div>
            </section>
          ) : null}

          <section className="mos-erp-cockpit-section" aria-label="AI çalışanlar">

            <h2 className="mos-erp-cockpit-section__title">AI Çalışanlar</h2>

            <div className="dw-grid dw-grid--experience">

              {hub.cards.map((card) => (

                <DigitalWorkforceCard

                  key={card.id}

                  card={card}

                  isGlowing={glowWorkerIds.has(card.id)}

                  showSuccessTick={successWorkerIds.has(card.id)}

                  onOpen={openWorker}

                />

              ))}

            </div>

          </section>



          <AiActivityPanel rows={aiActivityRows} onOpen={openWorker} />

          <OperationFeedPanel items={hub.operationFeed ?? []} />

        </>

      )}



      <DigitalWorkforceDrawer

        open={Boolean(selectedWorkerId)}

        detail={liveDetail}

        loading={detailLoading}

        recentCompleteFlash={

          selectedWorkerId

            ? successWorkerIds.has(selectedWorkerId) ||

              Boolean(livingMap[selectedWorkerId]?.showCompletedAnim)

            : false

        }

        onClose={closeDrawer}

      />

    </div>

  )

}


