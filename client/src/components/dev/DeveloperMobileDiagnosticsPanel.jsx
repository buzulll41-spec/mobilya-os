import { useEffect, useMemo, useState } from 'react'
import { isRealDeviceTestMode } from '../../config/appMode.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import { BUILD_STATUS } from '../../constants/buildStatus.js'

const MAX_OFFENDERS = 20
const MAX_TOUCH_LOGS = 12

function getViewportMetrics() {
  const vv = window.visualViewport
  const doc = document.documentElement
  const body = document.body
  return {
    innerWidth: window.innerWidth,
    visualViewportWidth: vv?.width ?? null,
    documentClientWidth: doc.clientWidth,
    documentScrollWidth: doc.scrollWidth,
    bodyClientWidth: body?.clientWidth ?? null,
    bodyScrollWidth: body?.scrollWidth ?? null,
    scrollX: window.scrollX,
    documentScrollLeft: doc.scrollLeft,
    bodyScrollLeft: body?.scrollLeft ?? null,
    route: window.location.hash || '#/',
    standalone:
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
    isSecureContext: window.isSecureContext,
  }
}

function toSelector(node) {
  if (!(node instanceof Element)) return null
  const parts = []
  let current = node
  let depth = 0
  while (current && depth < 5) {
    let part = current.tagName.toLowerCase()
    if (current.id) {
      part += `#${current.id}`
      parts.unshift(part)
      break
    }
    const classes = Array.from(current.classList).slice(0, 3)
    if (classes.length) part += `.${classes.join('.')}`
    parts.unshift(part)
    current = current.parentElement
    depth += 1
  }
  return parts.join(' > ')
}

function classifyContainer(selector) {
  const value = String(selector ?? '')
  if (!value) return 'unknown'
  if (value.includes('mos-mobile-action-bar')) return 'bottom-navigation'
  if (value.includes('mos-mobile-tabbar')) return 'bottom-navigation'
  if (value.includes('mos-mobile-quick-actions')) return 'quick-action-bar'
  if (value.includes('mos-mobile-store-chips')) return 'tabs-row'
  if (value.includes('mos-erp-week-filters') || value.includes('date')) return 'date-strip'
  if (value.includes('now-')) return 'modal-wizard-shell'
  if (value.includes('mos-overlay') || value.includes('drawer') || value.includes('sheet')) return 'drawer-overlay'
  if (value.includes('mos-content') || value.includes('mos-main') || value.includes('mos-page') || value.includes('mos-dash')) return 'route-shell'
  return 'internal-scroller'
}

function getHorizontalScroller(startNode) {
  let current = startNode instanceof Element ? startNode : null
  while (current) {
    const style = getComputedStyle(current)
    const overflowX = style.overflowX
    const canScroll = current.scrollWidth > current.clientWidth + 1
    if (canScroll || overflowX === 'auto' || overflowX === 'scroll') {
      return {
        selector: toSelector(current),
        scrollLeft: current.scrollLeft,
        scrollWidth: current.scrollWidth,
        clientWidth: current.clientWidth,
        overflowX,
        touchAction: style.touchAction,
        overscrollBehaviorX: style.overscrollBehaviorX,
        kind: classifyContainer(toSelector(current)),
      }
    }
    current = current.parentElement
  }
  return null
}

function collectOffenders() {
  const vvWidth = window.visualViewport?.width ?? window.innerWidth
  const elements = Array.from(document.body.querySelectorAll('*'))
  const offenders = []

  for (const element of elements) {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    const style = getComputedStyle(element)
    const widthExpr = `${style.width} ${style.minWidth}`
    const reasons = []
    if (rect.left < -1) reasons.push('left<0')
    if (rect.right > vvWidth + 1) reasons.push('right>viewport')
    if (element.scrollWidth > element.clientWidth + 1) reasons.push('scrollWidth>clientWidth')
    if (style.transform !== 'none') reasons.push('transform')
    if (style.position === 'fixed' || style.position === 'sticky' || style.position === 'absolute') reasons.push(`position:${style.position}`)
    if (widthExpr.includes('vw') || style.maxWidth.includes('vw')) reasons.push('vw-width')
    if (style.marginLeft.startsWith('-') || style.marginRight.startsWith('-')) reasons.push('negative-margin')
    if (style.transform.includes('translateX')) reasons.push('translateX')
    if (!reasons.length) continue
    offenders.push({
      selector: toSelector(element),
      left: Number(rect.left.toFixed(2)),
      right: Number(rect.right.toFixed(2)),
      width: Number(rect.width.toFixed(2)),
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      computedWidth: style.width,
      minWidth: style.minWidth,
      maxWidth: style.maxWidth,
      marginLeft: style.marginLeft,
      marginRight: style.marginRight,
      transform: style.transform,
      position: style.position,
      overflowX: style.overflowX,
      touchAction: style.touchAction,
      overscrollBehaviorX: style.overscrollBehaviorX,
      reasons,
    })
  }

  offenders.sort((a, b) => {
    const aDelta = Math.max(0, -a.left, a.right - vvWidth, a.scrollWidth - a.clientWidth)
    const bDelta = Math.max(0, -b.left, b.right - vvWidth, b.scrollWidth - b.clientWidth)
    return bDelta - aDelta
  })

  return offenders.slice(0, MAX_OFFENDERS)
}

export default function DeveloperMobileDiagnosticsPanel() {
  const visible = isRealDeviceTestMode()
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(() => ({ metrics: null, offenders: [], touchLogs: [] }))
  const [copyLabel, setCopyLabel] = useState('Layout Snapshot')

  useEffect(() => {
    if (!visible || !open || typeof window === 'undefined') return undefined

    let touchStartState = null

    const publishSnapshot = () => {
      const offenders = collectOffenders()
      const next = {
        metrics: getViewportMetrics(),
        offenders,
        widestOffender: offenders[0] ?? null,
        apiBase: getApiBaseUrl() ?? 'mock',
        build: BUILD_STATUS,
        touchLogs: window.__mosMobileDiagTouchLogs ?? [],
      }
      window.__mosMobileDiag = next
      setSnapshot(next)
      console.info('[mos-mobile-diag]', next)
    }

    const appendTouchLog = (phase, touch) => {
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      const scroller = getHorizontalScroller(target)
      const entry = {
        ts: Date.now(),
        phase,
        x: Number(touch.clientX.toFixed(2)),
        y: Number(touch.clientY.toFixed(2)),
        before: touchStartState,
        after: getViewportMetrics(),
        targetSelector: toSelector(target),
        nearestScrollableAncestor: scroller,
      }
      const logs = [...(window.__mosMobileDiagTouchLogs ?? []), entry].slice(-MAX_TOUCH_LOGS)
      window.__mosMobileDiagTouchLogs = logs
    }

    const onTouchStart = (event) => {
      const touch = event.touches[0]
      if (!touch) return
      touchStartState = getViewportMetrics()
      appendTouchLog('touchstart', touch)
      publishSnapshot()
    }

    const onTouchMove = (event) => {
      const touch = event.touches[0]
      if (!touch) return
      appendTouchLog('touchmove', touch)
      publishSnapshot()
    }

    const onTouchEnd = () => {
      touchStartState = null
      publishSnapshot()
    }

    const onResizeOrScroll = () => publishSnapshot()

    publishSnapshot()
    const intervalId = window.setInterval(publishSnapshot, 2500)
    window.addEventListener('scroll', onResizeOrScroll, { passive: true })
    window.visualViewport?.addEventListener('resize', onResizeOrScroll)
    window.visualViewport?.addEventListener('scroll', onResizeOrScroll)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('scroll', onResizeOrScroll)
      window.visualViewport?.removeEventListener('resize', onResizeOrScroll)
      window.visualViewport?.removeEventListener('scroll', onResizeOrScroll)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [visible, open])

  const lastTouch = useMemo(() => snapshot.touchLogs.at(-1) ?? null, [snapshot.touchLogs])

  async function handleLayoutSnapshot() {
    const summary = [
      'MOBILYA OS DEVICE SNAPSHOT',
      `route: ${snapshot.metrics?.route ?? '#/'}`,
      `innerWidth: ${snapshot.metrics?.innerWidth ?? '—'}`,
      `visualViewport.width: ${snapshot.metrics?.visualViewportWidth ?? '—'}`,
      `document.scrollWidth: ${snapshot.metrics?.documentScrollWidth ?? '—'}`,
      `scrollX: ${snapshot.metrics?.scrollX ?? '—'}`,
      `standalone: ${snapshot.metrics?.standalone ? 'yes' : 'no'}`,
      `secureContext: ${snapshot.metrics?.isSecureContext ? 'yes' : 'no'}`,
      `apiBase: ${snapshot.apiBase ?? 'mock'}`,
      `version: ${snapshot.build?.version ?? BUILD_STATUS.version}`,
      `timestamp: ${snapshot.build?.timestamp ?? BUILD_STATUS.timestamp}`,
      `widestOverflowingSelector: ${snapshot.widestOffender?.selector ?? 'none'}`,
      `widestElementWidth: ${snapshot.widestOffender?.width ?? '0'}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(summary)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Layout Snapshot'), 1600)
    } catch {
      setCopyLabel('Copy failed')
      window.setTimeout(() => setCopyLabel('Layout Snapshot'), 1600)
    }
  }

  if (!visible) return null

  return (
    <div className={`mos-dev-mobile-diag${open ? ' mos-dev-mobile-diag--open' : ''}`}>
      <button
        type="button"
        className="mos-dev-mobile-diag__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Device Debug
      </button>
      {open ? (
        <div className="mos-dev-mobile-diag__panel" role="region" aria-label="Mobile diagnostics panel">
          <strong>Physical Device Diagnostics</strong>
          <dl>
            <div><dt>innerWidth</dt><dd>{snapshot.metrics?.innerWidth ?? '—'}</dd></div>
            <div><dt>visualViewport.width</dt><dd>{snapshot.metrics?.visualViewportWidth ?? '—'}</dd></div>
            <div><dt>document.clientWidth</dt><dd>{snapshot.metrics?.documentClientWidth ?? '—'}</dd></div>
            <div><dt>document.scrollWidth</dt><dd>{snapshot.metrics?.documentScrollWidth ?? '—'}</dd></div>
            <div><dt>body.clientWidth</dt><dd>{snapshot.metrics?.bodyClientWidth ?? '—'}</dd></div>
            <div><dt>body.scrollWidth</dt><dd>{snapshot.metrics?.bodyScrollWidth ?? '—'}</dd></div>
            <div><dt>scrollX</dt><dd>{snapshot.metrics?.scrollX ?? '—'}</dd></div>
            <div><dt>document.scrollLeft</dt><dd>{snapshot.metrics?.documentScrollLeft ?? '—'}</dd></div>
            <div><dt>body.scrollLeft</dt><dd>{snapshot.metrics?.bodyScrollLeft ?? '—'}</dd></div>
            <div><dt>route</dt><dd>{snapshot.metrics?.route ?? '—'}</dd></div>
            <div><dt>standalone</dt><dd>{snapshot.metrics?.standalone ? 'yes' : 'no'}</dd></div>
            <div><dt>app version</dt><dd>{snapshot.build?.version ?? BUILD_STATUS.version}</dd></div>
            <div><dt>api base</dt><dd>{snapshot.apiBase ?? 'mock'}</dd></div>
            <div><dt>widest offender</dt><dd>{snapshot.widestOffender?.selector ?? 'none'}</dd></div>
            <div><dt>widest width</dt><dd>{snapshot.widestOffender?.width ?? '0'}</dd></div>
          </dl>

          <div className="mos-dev-mobile-diag__actions">
            <button type="button" onClick={() => void handleLayoutSnapshot()}>{copyLabel}</button>
          </div>

          <div className="mos-dev-mobile-diag__section">
            <strong>Last touch</strong>
            <pre>{lastTouch ? JSON.stringify(lastTouch, null, 2) : 'No touch logs yet.'}</pre>
          </div>

          <div className="mos-dev-mobile-diag__section">
            <strong>Top offenders</strong>
            <ol className="mos-dev-mobile-diag__list">
              {snapshot.offenders.map((offender) => (
                <li key={`${offender.selector}-${offender.left}-${offender.right}`}>
                  <code>{offender.selector}</code>
                  <div>{offender.reasons.join(', ')}</div>
                  <div>L {offender.left} / R {offender.right} / W {offender.width}</div>
                  <div>cw {offender.computedWidth} / min {offender.minWidth} / max {offender.maxWidth}</div>
                  <div>ml {offender.marginLeft} / mr {offender.marginRight}</div>
                  <div>{offender.position} / {offender.overflowX} / {offender.touchAction}</div>
                  <div>{offender.transform}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  )
}