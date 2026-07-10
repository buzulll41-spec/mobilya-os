import { useBuildStatus } from '../../hooks/useBuildStatus.js'

/** @param {import('../../hooks/useBuildStatus.js').BuildStatusSnapshot['api']} state */
function labelFor(state) {
  if (state === 'checking') return 'API…'
  if (state === 'connected') return 'API OK'
  if (state === 'mock') return 'API Mock'
  return 'API Down'
}

/** @param {import('../../hooks/useBuildStatus.js').BuildStatusSnapshot['api']} state */
function toneClass(state) {
  if (state === 'connected') return 'is-connected'
  if (state === 'mock') return 'is-mock'
  if (state === 'checking') return 'is-checking'
  return 'is-disconnected'
}

export default function ApiConnectionStatus() {
  const { api, database } = useBuildStatus()

  return (
    <div className="mos-api-status" aria-label="API bağlantı durumu">
      <span className={`mos-api-status__pill ${toneClass(api)}`} title="API bağlantısı">
        {labelFor(api)}
      </span>
      <span
        className={`mos-api-status__pill mos-api-status__pill--db ${toneClass(database)}`}
        title="Veritabanı bağlantısı"
      >
        {database === 'connected' ? 'DB OK' : database === 'mock' ? 'DB Mock' : database === 'checking' ? 'DB…' : 'DB Down'}
      </span>
    </div>
  )
}
