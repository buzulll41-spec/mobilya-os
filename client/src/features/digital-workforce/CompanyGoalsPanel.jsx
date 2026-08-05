import { memo, useCallback } from 'react'
import { updateCompanyGoals } from '../../services/company-goals/companyGoalsStore.js'

/**
 * @param {{
 *   goals: { id: string, label: string, value: number, suffix?: string }[]
 *   editable?: boolean
 * }} props
 */
function CompanyGoalsPanel({ goals, editable = false }) {
  const onChange = useCallback((id, raw) => {
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    updateCompanyGoals({ [id]: value }, 'CEO')
  }, [])

  return (
    <section className="mos-erp-cockpit-section dw-company-goals" aria-label="Global Company Goals">
      <h2 className="mos-erp-cockpit-section__title">GLOBAL COMPANY GOALS</h2>
      <dl className="dw-company-goals__grid">
        {goals.map((goal) => (
          <div key={goal.id} className="dw-company-goals__item">
            <dt>{goal.label}</dt>
            <dd>
              {editable ? (
                <input
                  type="number"
                  className="dw-company-goals__input"
                  value={goal.value}
                  onChange={(e) => onChange(goal.id, e.target.value)}
                  aria-label={goal.label}
                />
              ) : (
                goal.value
              )}
              {goal.suffix ? <span className="dw-company-goals__suffix">{goal.suffix}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default memo(CompanyGoalsPanel)
