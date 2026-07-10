import { useCallback, useEffect, useRef, useState } from 'react'
import { getDigitalWorkforceLivingEngine } from '../mappers/digital-workforce/digitalWorkforceLivingEngine.js'

const LIVE_PUBLISH_MS = 480

/**
 * WorkerStore + rAF tabanlı living workforce hook.
 * Tek döngü — kart başına setInterval yok.
 *
 * @param {import('../services/mockDigitalWorkforceStore.js').ReturnType<import('../services/mockDigitalWorkforceStore.js').getDigitalWorkforceCoreSnapshot> | null} snapshot
 */
export function useLivingDigitalWorkforce(snapshot) {
  const engineRef = useRef(getDigitalWorkforceLivingEngine())
  const [livingVersion, setLivingVersion] = useState(0)
  const lastPublishRef = useRef(0)

  const bump = useCallback(() => {
    setLivingVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    if (!snapshot) return undefined
    const engine = engineRef.current
    engine.syncFromSnapshot(snapshot)
    if (engine.consumeDirty()) bump()
  }, [snapshot, bump])

  useEffect(() => {
    let rafId = 0
    let alive = true

    const loop = (now) => {
      if (!alive) return
      const engine = engineRef.current
      engine.tick(now)
      const shouldPublish =
        engine.consumeDirty() || now - lastPublishRef.current >= LIVE_PUBLISH_MS
      if (shouldPublish) {
        lastPublishRef.current = now
        bump()
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(rafId)
    }
  }, [bump])

  const engine = engineRef.current
  const livingMap = engine.getLivingMap()
  void livingVersion

  return {
    engine,
    livingMap,
    livingVersion,
  }
}
