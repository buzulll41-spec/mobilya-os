import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingBlock from '../components/LoadingBlock.jsx'
import { buildPilotReadinessView } from '../mappers/pilot/pilotReadinessModel.js'
import { getApiBaseUrl } from '../config/dataSource.js'
import { getWooConnectionHealth } from '../services/wooConnectionClient.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { useOrders } from '../state/useOrders.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { applyPilotScope, getEffectivePilotScope, getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import '../styles/pilot-readiness.css'

/**
 * @param {'PASS' | 'WARNING' | 'FAIL'} status
 */
function statusClass(status) {
  if (status === 'PASS') return 'is-pass'
  if (status === 'WARNING') return 'is-warning'
  return 'is-fail'
}

export default function PilotReadinessPage() {
  const { user } = useAuth()
  const { orders, collectionRowVMs } = useOrders()
  const [productCount, setProductCount] = useState(0)
  const [wooConfigured, setWooConfigured] = useState(/** @type {boolean | null} */ (null))
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await productMasterClient.listProductMaster({ pageSize: 200 })
      setProductCount(res.items?.length ?? 0)
      if (getApiBaseUrl()) {
        const woo = await getWooConnectionHealth().catch(() => null)
        setWooConfigured(Boolean(woo?.storeUrl))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const scope = getEffectivePilotScope(user?.role)
  const realOrders = useMemo(
    () => applyPilotScope(orders, scope, getOrderPilotKind),
    [orders, scope],
  )
  const realCollections = useMemo(
    () => applyPilotScope(collectionRowVMs, scope, getOrderPilotKind),
    [collectionRowVMs, scope],
  )

  const view = useMemo(
    () =>
      buildPilotReadinessView({
        role: user?.role,
        ordersCount: realOrders.length,
        collectionCount: realCollections.length,
        productCount,
        apiMode: Boolean(getApiBaseUrl()),
        wooConfigured,
      }),
    [user?.role, realOrders.length, realCollections.length, productCount, wooConfigured],
  )

  if (loading) {
    return (
      <div className="mos-pilot-ready">
        <LoadingBlock label="Pilot hazırlık kontrol listesi yükleniyor…" />
      </div>
    )
  }

  return (
    <div className="mos-pilot-ready">
      <header className="mos-pilot-ready__head">
        <h1 className="mos-pilot-ready__title">Canlı Mağaza Pilot Hazırlığı</h1>
        <p className="mos-pilot-ready__sub">
          {view.summary.passCount} PASS · {view.summary.warnCount} WARNING · {view.summary.failCount} FAIL
        </p>
        <p
          className={`mos-pilot-ready__verdict${view.readyForPilot ? ' is-ready' : ' is-not-ready'}`}
        >
          {view.readyForPilot ? 'CANLI MAĞAZA PİLOTUNA HAZIR' : 'EK KONTROL GEREKİYOR'}
        </p>
      </header>

      <ul className="mos-pilot-ready__list">
        {view.items.map((item) => (
          <li key={item.id} className={`mos-pilot-ready__item ${statusClass(item.status)}`}>
            <div className="mos-pilot-ready__item-head">
              <span className="mos-pilot-ready__status">{item.status}</span>
              <strong>{item.label}</strong>
            </div>
            <p className="mos-pilot-ready__detail">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
