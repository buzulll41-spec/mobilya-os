import { useBuildStatus } from '../hooks/useBuildStatus.js'

/** @param {import('../hooks/useBuildStatus.js').BuildStatusSnapshot['api']} state */
function connectionLabel(state, kind) {
  if (state === 'checking') return `${kind} kontrol ediliyor…`
  if (state === 'connected') return `${kind} Connected`
  if (state === 'mock') return kind === 'API' ? 'API Mock' : 'Database Mock'
  return `${kind} Disconnected`
}

/** @param {import('../hooks/useBuildStatus.js').BuildStatusSnapshot['api']} state */
function connectionClass(state) {
  if (state === 'connected') return 'is-connected'
  if (state === 'mock') return 'is-mock'
  if (state === 'checking') return 'is-checking'
  return 'is-disconnected'
}

export default function BuildStatusIndicator() {
  const { build, api, database } = useBuildStatus()
  const showTestBuild = build.mode === 'real-device-test'

  return (
    <div className="mos-build-status" aria-label="Build durumu">
      <span className="mos-build-status__edition">{build.edition}</span>
      <span className="mos-build-status__build">Build {build.build}</span>
      {showTestBuild ? <span className="mos-build-status__line is-checking">{build.label}</span> : null}
      {showTestBuild ? <span className="mos-build-status__line">Version {build.version}</span> : null}
      {showTestBuild && build.timestamp ? <span className="mos-build-status__line">{build.timestamp}</span> : null}
      <span className={`mos-build-status__line ${connectionClass(api)}`}>
        {connectionLabel(api, 'API')}
      </span>
      <span className={`mos-build-status__line ${connectionClass(database)}`}>
        {connectionLabel(database, 'Database')}
      </span>
    </div>
  )
}
