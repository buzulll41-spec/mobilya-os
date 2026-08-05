import { useCallback, useEffect, useMemo, useState } from 'react'

import ExecutiveMiniTrend from '../features/executive/ExecutiveMiniTrend.jsx'

import ExecutiveAnimatedKpi from '../features/executive/ExecutiveAnimatedKpi.jsx'

import ExecutiveLiveFeed from '../features/executive/ExecutiveLiveFeed.jsx'

import ExecutiveHealthScore from '../features/executive/ExecutiveHealthScore.jsx'

import ExecutiveTodaySummary from '../features/executive/ExecutiveTodaySummary.jsx'

import ExecutiveAiActivity from '../features/executive/ExecutiveAiActivity.jsx'
import ExecutiveLiveAi from '../features/executive/ExecutiveLiveAi.jsx'

import ExecutiveDepartmentHeatmap from '../features/executive/ExecutiveDepartmentHeatmap.jsx'

import ExecutiveLearnedInsights from '../features/executive/ExecutiveLearnedInsights.jsx'

import ExecutiveAiCompanySummary from '../features/executive/ExecutiveAiCompanySummary.jsx'
import OperationFeedPanel from '../features/digital-workforce/OperationFeedPanel.jsx'
import ExecutiveAiExecutions from '../features/executive/ExecutiveAiExecutions.jsx'

import LoadingBlock from '../components/LoadingBlock.jsx'

import { buildExecutiveCommandCenterView } from '../mappers/executive/executiveCommandCenterModel.js'

import { buildCeoExperienceView } from '../mappers/executive/ceoExperienceModel.js'

import { mergeCeoOrchestrationTimeline } from '../mappers/executive/ceoOrchestrationModel.js'

import { getDigitalWorkforceLivingEngine } from '../mappers/digital-workforce/digitalWorkforceLivingEngine.js'

import { formatTry } from '../data/dashboardHelpers.js'

import { DEMO_TODAY } from '../data/constants.js'

import { getSupplierLedgerCenter } from '../services/supplyOperationsClient.js'

import { getDigitalWorkforceSnapshot, subscribeDigitalWorkforceStore } from '../services/digitalWorkforceClient.js'

import { getOrchestrationSnapshot, subscribeWorkerOrchestrator } from '../services/workerOrchestratorClient.js'
import { subscribeCompanyManagerStore } from '../services/company-manager/companyManagerStore.js'
import { subscribeGenesisStore } from '../services/genesis/genesisStore.js'
import { subscribeAiEmployeeActivity } from '../services/ai-employee/aiEmployeeActivityStore.js'
import GenesisLivingPanel from '../features/genesis/GenesisLivingPanel.jsx'
import GenesisCompanyScorePanel from '../features/genesis/GenesisCompanyScorePanel.jsx'
import GenesisPredictionsPanel from '../features/genesis/GenesisPredictionsPanel.jsx'
import DigitalBoardMeetingPanel from '../features/genesis/DigitalBoardMeetingPanel.jsx'
import CeoChatPanel from '../features/genesis/CeoChatPanel.jsx'
import { buildGenesisHubExtras } from '../mappers/genesis/genesisModel.js'
import { isGenesisEnabled } from '../config/genesisConfig.js'
import '../styles/genesis.css'

import { useOrders } from '../state/useOrders.js'

import { useShipmentPlans } from '../hooks/useShipmentPlans.jsx'

import { getAllMissingItemsSnapshot } from '../services/mockMissingItemStore.js'

import { formatShortDate } from '../utils/dates.js'

import '../styles/mos-erp-ops.css'

import '../styles/executive-command-center.css'



/**

 * @param {'critical' | 'warning' | 'success' | 'info' | 'neutral' | string} [tone]

 */

function toneClass(tone) {

  if (tone === 'critical') return 'ecc-tone--critical'

  if (tone === 'warning') return 'ecc-tone--warning'

  if (tone === 'success') return 'ecc-tone--success'

  if (tone === 'collect' || tone === 'sales' || tone === 'ship') return 'ecc-tone--accent'

  return 'ecc-tone--neutral'

}



/**

 * @param {{ onNavigate?: (page: string, ctx?: { workerId?: string }) => void }} [props]

 */

export default function ExecutiveCommandCenterPage({ onNavigate }) {

  const {

    orders,

    salesOrderListItemDtos,

    collectionRowVMs,

    shipmentRowVMs,

    domainEvents,

  } = useOrders()

  const { plans } = useShipmentPlans()

  const [supplierLedger, setSupplierLedger] = useState(/** @type {import('../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterDto | null} */ (null))

  const [loadingLedger, setLoadingLedger] = useState(true)

  const [liveVersion, setLiveVersion] = useState(0)
  const [genesisVersion, setGenesisVersion] = useState(0)



  useEffect(() => {

    const bump = () => setLiveVersion((v) => v + 1)

    void getDigitalWorkforceSnapshot().then((snap) => {

      getDigitalWorkforceLivingEngine().syncFromSnapshot(snap)

      bump()

    })

    const unsubOrch = subscribeWorkerOrchestrator(bump)

    const unsubWorkforce = subscribeDigitalWorkforceStore(() => {

      getDigitalWorkforceSnapshot().then((snap) => {

        getDigitalWorkforceLivingEngine().syncFromSnapshot(snap)

        bump()

      })

    })

    const unsubEmployee = subscribeAiEmployeeActivity(bump)
    const unsubCompanyManager = subscribeCompanyManagerStore(bump)
    const unsubGenesis = subscribeGenesisStore(() => setGenesisVersion((v) => v + 1))

    return () => {

      unsubOrch()

      unsubWorkforce()

      unsubEmployee()

      unsubCompanyManager()
      unsubGenesis()

    }

  }, [])



  useEffect(() => {

    let alive = true

    let rafId = 0

    let lastPublish = 0

    const loop = (now) => {

      if (!alive) return

      const engine = getDigitalWorkforceLivingEngine()

      engine.tick(now)

      if (engine.consumeDirty() || now - lastPublish >= 480) {

        lastPublish = now

        setLiveVersion((v) => v + 1)

      }

      rafId = requestAnimationFrame(loop)

    }

    rafId = requestAnimationFrame(loop)

    return () => {

      alive = false

      cancelAnimationFrame(rafId)

    }

  }, [])



  const loadLedger = useCallback(async () => {

    setLoadingLedger(true)

    try {

      const res = await getSupplierLedgerCenter({ sort: 'health' })

      setSupplierLedger(res)

    } catch {

      setSupplierLedger(null)

    } finally {

      setLoadingLedger(false)

    }

  }, [])



  useEffect(() => {

    void loadLedger()

  }, [loadLedger])



  const experience = useMemo(() => {

    void liveVersion

    const baseView = buildExecutiveCommandCenterView({

      orders,

      listItemDtos: salesOrderListItemDtos,

      collectionRows: collectionRowVMs,

      shipmentRowVMs,

      missingItems: getAllMissingItemsSnapshot(),

      domainEvents,

      shipmentPlans: plans,

      supplierLedger,

      todayIso: DEMO_TODAY,

    })



    const orchSnap = getOrchestrationSnapshot()

    const orchestrationTimeline = mergeCeoOrchestrationTimeline(orchSnap.ceoTimeline, domainEvents ?? [])

    const livingMap = getDigitalWorkforceLivingEngine().getLivingMap()



    return buildCeoExperienceView({

      baseView,

      domainEvents: domainEvents ?? [],

      orchestrationTimeline,

      livingMap,

      orders,

      listItemDtos: salesOrderListItemDtos,

      todayIso: DEMO_TODAY,

    })

  }, [

    liveVersion,

    orders,

    salesOrderListItemDtos,

    collectionRowVMs,

    shipmentRowVMs,

    domainEvents,

    plans,

    supplierLedger,

  ])

  const genesisExtras = useMemo(() => {
    void genesisVersion
    return buildGenesisHubExtras()
  }, [genesisVersion])



  if (loadingLedger && !supplierLedger) {

    return (

      <div className="mos-page ecc-page">

        <LoadingBlock label="CEO Komuta Merkezi yükleniyor…" />

      </div>

    )

  }



  return (

    <div className="mos-page ecc-page ecc-page--experience">

      <header className="ecc-head">

        <div>

          <p className="ecc-head__eyebrow">Yönetici Merkezi</p>

          <h1 className="ecc-head__title">CEO Komuta Merkezi</h1>

          <p className="ecc-head__sub">

            {formatShortDate(DEMO_TODAY)} · CEO Experience V1 · 10 saniyede şirket özeti

          </p>

        </div>

      </header>



      <div className="ecc-layout">

        <div className="ecc-layout__main">

          <div className="ecc-hero-grid">

            <ExecutiveHealthScore health={experience.health} />

            <ExecutiveTodaySummary summary={experience.todaySummary} />

          </div>



          <section className="ecc-section" aria-label="Canlı KPI">

            <h2 className="ecc-section__title">Canlı KPI</h2>

            <div className="ecc-kpi-grid">

              {experience.todayStatus.map((kpi) => (

                <ExecutiveAnimatedKpi key={kpi.id} kpi={kpi} onNavigate={onNavigate} />

              ))}

            </div>

          </section>



          <div className="ecc-main-grid">

            <ExecutiveLiveAi

              liveAi={experience.liveAi}

              onOpenWorker={(workerId) => onNavigate?.('digital-workforce', { workerId })}

            />



            <ExecutiveAiActivity

              workers={experience.aiActivity}

              onOpenWorker={(workerId) => onNavigate?.('digital-workforce', { workerId })}

            />



            <section className="ecc-section ecc-section--critical" aria-label="Kritik riskler">

              <h2 className="ecc-section__title">Kritik Riskler · Top 5</h2>

              {experience.topCritical.length === 0 ? (

                <p className="ecc-empty">Kritik konu yok — operasyon sakin.</p>

              ) : (

                <ul className="ecc-critical-list">

                  {experience.topCritical.map((item) => (

                    <li key={item.id}>

                      <button

                        type="button"

                        className={`ecc-critical-item ecc-critical-item--${item.tone}`}

                        onClick={() => {

                          if (!item.navTarget) return

                          onNavigate?.(

                            item.navTarget,

                            item.workerId ? { workerId: item.workerId } : undefined,

                          )

                        }}

                      >

                        <span className="ecc-critical-item__title">{item.title}</span>

                        <span className="ecc-critical-item__sub">{item.subtitle}</span>

                      </button>

                    </li>

                  ))}

                </ul>

              )}

            </section>

          </div>



          <ExecutiveDepartmentHeatmap rows={experience.departmentHeatmap} />



          <section className="ecc-section" aria-label="Operasyon özeti">

            <h2 className="ecc-section__title">Operasyon Özeti · Son 30 Gün</h2>

            <div className="ecc-trend-grid">

              {Object.values(experience.operationTrends).map((trend) => (

                <ExecutiveMiniTrend

                  key={trend.title}

                  title={trend.title}

                  labels={trend.labels}

                  values={trend.values}

                  tone={trend.tone}

                  formatValue={

                    trend.title === 'Tahsilat'

                      ? (n) => formatTry(n)

                      : (n) => String(Math.round(n))

                  }

                />

              ))}

            </div>

          </section>



          <div className="ecc-main-grid ecc-main-grid--3">

            <section className="ecc-section" aria-label="Personel durumu">

              <h2 className="ecc-section__title">Personel Durumu · Bugün</h2>

              <ul className="ecc-staff-list">

                {experience.staffWorkload.map((row) => (

                  <li key={row.id} className={`ecc-staff-row ${toneClass(row.tone)}`}>

                    <span className="ecc-staff-row__role">{row.role}</span>

                    <span className="ecc-staff-row__name">{row.name}</span>

                    <span className="ecc-staff-row__load">{row.load} iş</span>

                  </li>

                ))}

              </ul>

            </section>



            <section className="ecc-section" aria-label="Risk paneli">

              <h2 className="ecc-section__title">Risk Paneli</h2>

              <div className="ecc-risk-grid">

                {experience.riskPanel.map((risk) => (

                  <div key={risk.id} className={`ecc-risk-card ${toneClass(risk.tone)}`}>

                    <span className="ecc-risk-card__label">{risk.label}</span>

                    <span className="ecc-risk-card__score">{risk.score}</span>

                    <span className="ecc-risk-card__hint">{risk.hint}</span>

                  </div>

                ))}

              </div>

            </section>



            <section className="ecc-section" aria-label="Bugün ne yapmalıyım">

              <h2 className="ecc-section__title">Bugün Ne Yapmalıyım</h2>

              {experience.todayTasks.length === 0 ? (

                <p className="ecc-empty">Otomatik görev üretilmedi.</p>

              ) : (

                <ul className="ecc-task-list">

                  {experience.todayTasks.map((task) => (

                    <li key={task.id}>

                      <button

                        type="button"

                        className="ecc-task-item"

                        onClick={() => task.navTarget && onNavigate?.(task.navTarget)}

                      >

                        <span className="ecc-task-item__mark" aria-hidden>

                          ✓

                        </span>

                        <span>{task.text}</span>

                      </button>

                    </li>

                  ))}

                </ul>

              )}

            </section>

          </div>

        </div>



        <ExecutiveLiveFeed items={experience.liveFeed} />

        {isGenesisEnabled() ? (
          <>
            <GenesisLivingPanel living={genesisExtras.genesisLiving} />
            <GenesisCompanyScorePanel score={genesisExtras.genesisScore} />
            <GenesisPredictionsPanel predictions={genesisExtras.genesisPredictions} />
            <DigitalBoardMeetingPanel meeting={genesisExtras.boardMeeting} />
            <CeoChatPanel
              chat={genesisExtras.ceoChat}
              orders={orders}
              dtos={salesOrderListItemDtos}
              todayIso={DEMO_TODAY}
              onChatUpdate={() => setGenesisVersion((v) => v + 1)}
            />
          </>
        ) : null}

        <ExecutiveAiCompanySummary summary={experience.aiCompanySummary} />

        <OperationFeedPanel items={experience.operationFeed ?? []} />

        <ExecutiveLearnedInsights items={experience.learnedInsights ?? []} />

        <ExecutiveAiExecutions summary={experience.aiExecutions} />

      </div>

    </div>

  )

}


