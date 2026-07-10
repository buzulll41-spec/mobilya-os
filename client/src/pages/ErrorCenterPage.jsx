import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOperationalToday } from '../data/constants.js'
import { buildErrorCenterView } from '../mappers/goLive/errorCenterModel.js'
import {
  resolveErrorCenterEntry,
  subscribeErrorCenter,
} from '../lib/errorCenterStore.js'
import { CRITICAL_AUDIT_ACTION } from '../contracts/v1/goLive.js'
import { listOperationAudit } from '../lib/operationAuditLog.js'
import '../styles/error-center.css'

export default function ErrorCenterPage() {
  const todayIso = getOperationalToday()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const unsub = subscribeErrorCenter(() => setVersion((v) => v + 1))
    return unsub
  }, [])

  void version

  const view = useMemo(() => buildErrorCenterView(todayIso), [todayIso, version])
  const auditSample = useMemo(() => listOperationAudit(20), [version])

  const markResolved = useCallback((id) => {
    resolveErrorCenterEntry(id)
    setVersion((v) => v + 1)
  }, [])

  return (
    <div className="mos-error-center">
      <header className="mos-error-center__head">
        <h1 className="mos-error-center__title">Error Center</h1>
        <p className="mos-error-center__sub">
          Bugünkü hatalar ve son 100 kayıt — stack, kullanıcı, sayfa, saat, çözüm durumu.
        </p>
      </header>

      <div className="mos-error-center__stats">
        <div className="mos-error-center__stat">
          <strong>{view.todayCount}</strong>
          Bugünkü hata
        </div>
        <div className="mos-error-center__stat">
          <strong>{view.openCount}</strong>
          Açık
        </div>
        <div className="mos-error-center__stat">
          <strong>{view.totalShown}</strong>
          Son kayıtlar
        </div>
      </div>

      <h2 className="mos-go-live__panel-title">Bugünkü Hatalar</h2>
      {view.todayErrors.length === 0 ? (
        <p className="mos-error-center__empty">Bugün kayıtlı hata yok.</p>
      ) : (
        <ErrorTable rows={view.todayErrors} onResolve={markResolved} />
      )}

      <h2 className="mos-go-live__panel-title" style={{ marginTop: '1.5rem' }}>
        Son 100 Hata
      </h2>
      {view.recentErrors.length === 0 ? (
        <p className="mos-error-center__empty">Henüz hata kaydı yok.</p>
      ) : (
        <ErrorTable rows={view.recentErrors} onResolve={markResolved} />
      )}

      <h2 className="mos-go-live__panel-title" style={{ marginTop: '1.5rem' }}>
        Kritik Audit (son 20)
      </h2>
      <div className="mos-error-center__table-wrap">
        <table className="mos-error-center__table">
          <thead>
            <tr>
              <th>Saat</th>
              <th>Aksiyon</th>
              <th>Kullanıcı</th>
              <th>Detay</th>
            </tr>
          </thead>
          <tbody>
            {auditSample.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.occurredAt).toLocaleTimeString('tr-TR')}</td>
                <td>{a.action}</td>
                <td>
                  {a.actorName} ({a.actorRole})
                </td>
                <td>{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mos-error-center__sub" style={{ marginTop: '1rem' }}>
        İzlenen audit: {Object.values(CRITICAL_AUDIT_ACTION).join(', ')}
      </p>
    </div>
  )
}

/**
 * @param {{ rows: ReturnType<typeof buildErrorCenterView>['recentErrors'], onResolve: (id: string) => void }} props
 */
function ErrorTable({ rows, onResolve }) {
  return (
    <div className="mos-error-center__table-wrap">
      <table className="mos-error-center__table">
        <thead>
          <tr>
            <th>Saat</th>
            <th>Kategori</th>
            <th>Mesaj</th>
            <th>Stack</th>
            <th>Kullanıcı</th>
            <th>Sayfa</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.timeLabel}</td>
              <td>{row.categoryLabel}</td>
              <td className="mos-error-center__msg">{row.message}</td>
              <td className="mos-error-center__stack" title={row.stack}>
                {row.stack ?? '—'}
              </td>
              <td>{row.userLabel}</td>
              <td>{row.pageId}</td>
              <td>
                {row.resolved ? (
                  <span className="mos-error-center__resolved">Çözüldü</span>
                ) : (
                  <span className="mos-error-center__open">Açık</span>
                )}
              </td>
              <td>
                {!row.resolved ? (
                  <button
                    type="button"
                    className="mos-btn mos-btn-ghost mos-btn-sm"
                    onClick={() => onResolve(row.id)}
                  >
                    Çözüldü
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
