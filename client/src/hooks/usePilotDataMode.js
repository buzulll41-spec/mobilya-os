import { useCallback, useMemo, useState } from 'react'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import {
  applyPilotScope,
  canManagePilotScope,
  defaultPilotScopeForRole,
  readStoredPilotScope,
  writeStoredPilotScope,
} from '../lib/pilotRecordHeuristics.js'

/** @typedef {import('../lib/pilotRecordHeuristics.js').PilotDataScope} PilotDataScope */
/** @typedef {import('../lib/pilotRecordHeuristics.js').PilotRecordKind} PilotRecordKind */

export function usePilotDataMode() {
  const role = getCurrentAuthUser()?.role
  const canToggle = canManagePilotScope(role)

  const [scope, setScopeState] = useState(() => {
    if (!canManagePilotScope(role)) return /** @type {PilotDataScope} */ ('real')
    return readStoredPilotScope() ?? defaultPilotScopeForRole(role)
  })

  const effectiveScope = canToggle ? scope : /** @type {PilotDataScope} */ ('real')

  /** @param {PilotDataScope} next */
  const setScope = useCallback(
    (next) => {
      if (!canToggle) return
      setScopeState(next)
      writeStoredPilotScope(next)
    },
    [canToggle],
  )

  /** @type {<T>(items: T[], getKind: (item: T) => PilotRecordKind | null) => T[]} */
  const filterItems = useCallback(
    (items, getKind) => applyPilotScope(items, effectiveScope, getKind),
    [effectiveScope],
  )

  const modeHint = useMemo(() => {
    if (!canToggle) return 'Yalnızca gerçek operasyon kayıtları gösteriliyor.'
    if (effectiveScope === 'real') return 'Gerçek kayıtlar.'
    if (effectiveScope === 'pilot') return 'Demo / test kayıtları.'
    return 'Tüm kayıtlar (gerçek + demo/test).'
  }, [canToggle, effectiveScope])

  return {
    scope: effectiveScope,
    setScope,
    canToggle,
    filterItems,
    modeHint,
    isStoreMode: !canToggle,
  }
}
