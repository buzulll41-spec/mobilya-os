import { useEffect, useMemo, useState } from 'react'
import {
  buildMobileTestFlowState,
  markMobileTestStepComplete,
  resolveMobileTestStepForPage,
} from '../../services/mobile/mobileTestFlow.js'

const DISMISS_KEY = 'mobilya-os.mobile-test-flow-dismissed'

/**
 * @param {{
 *   page: string
 *   onNavigate: (id: string) => void
 *   visible?: boolean
 * }} props
 */
export default function MobileTestFlowPanel({ page, onNavigate, visible = true }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [tick, setTick] = useState(0)

  const flow = useMemo(() => buildMobileTestFlowState(), [tick])
  const pageStep = resolveMobileTestStepForPage(page)

  useEffect(() => {
    if (!pageStep || flow.completed.has(pageStep.id)) return
    markMobileTestStepComplete(pageStep.id)
    setTick((n) => n + 1)
  }, [page, pageStep, flow.completed])

  if (!visible || dismissed) return null

  const { nextStep, progressPct, steps, completed } = flow

  return (
    <section className="mos-mobile-test-flow" aria-label="Mobil test akışı">
      <header className="mos-mobile-test-flow__head">
        <div>
          <strong>Mobil Test Modu</strong>
          <span className="mos-mobile-test-flow__progress">{progressPct}% tamamlandı</span>
        </div>
        <button
          type="button"
          className="mos-mobile-test-flow__close"
          aria-label="Test panelini kapat"
          onClick={() => {
            setDismissed(true)
            try {
              sessionStorage.setItem(DISMISS_KEY, '1')
            } catch {
              /* ignore */
            }
          }}
        >
          ×
        </button>
      </header>

      <ol className="mos-mobile-test-flow__steps">
        {steps.map((step) => {
          const done = completed.has(step.id)
          const current = nextStep?.id === step.id
          return (
            <li
              key={step.id}
              className="mos-mobile-test-flow__step"
              data-done={done ? 'true' : 'false'}
              data-current={current ? 'true' : 'false'}
            >
              <button
                type="button"
                className="mos-mobile-test-flow__step-btn"
                onClick={() => onNavigate(step.page)}
              >
                <span className="mos-mobile-test-flow__step-num">{step.order}</span>
                <span className="mos-mobile-test-flow__step-label">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {nextStep ? (
        <p className="mos-mobile-test-flow__hint">
          Sıradaki: <strong>{nextStep.label}</strong> — {nextStep.hint}
        </p>
      ) : (
        <p className="mos-mobile-test-flow__hint mos-mobile-test-flow__hint--done">
          Demo akışı tamamlandı. Tüm adımlar kontrol edildi.
        </p>
      )}
    </section>
  )
}
