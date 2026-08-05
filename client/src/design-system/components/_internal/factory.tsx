export type DsState = 'default' | 'loading' | 'empty' | 'disabled' | 'error' | 'success'

export interface DsComponentProps {
  state?: DsState
  title?: string
  subtitle?: string
}

const stateLabelMap: Record<DsState, string> = {
  default: 'Default',
  loading: 'Loading',
  empty: 'Empty',
  disabled: 'Disabled',
  error: 'Error',
  success: 'Success',
}

function normalizeTitle(name: string, title?: string) {
  return title || name
}

function normalizeSubtitle(state: DsState, subtitle?: string) {
  if (subtitle) return subtitle
  if (state === 'loading') return 'Data is loading'
  if (state === 'empty') return 'No data available'
  if (state === 'error') return 'An operation error occurred'
  if (state === 'success') return 'Operation completed successfully'
  if (state === 'disabled') return 'Action is currently disabled'
  return 'Ready for interaction'
}

export function createDisplayComponent(name: string) {
  return function DisplayComponent({ state = 'default', title, subtitle }: DsComponentProps) {
    const safeTitle = normalizeTitle(name, title)
    const safeSubtitle = normalizeSubtitle(state, subtitle)
    const disabledAttr = state === 'disabled'

    return (
      <article className={`ds-component ds-component--${state}`} aria-disabled={disabledAttr}>
        <div className="ds-component__head">
          <strong className="ds-text-label">{safeTitle}</strong>
          <span className={`ds-badge ds-badge--${state}`}>{stateLabelMap[state]}</span>
        </div>
        <p className="ds-text-body-small">{safeSubtitle}</p>
      </article>
    )
  }
}

export function createActionComponent(name: string, cta = 'Action') {
  return function ActionComponent({ state = 'default', title, subtitle }: DsComponentProps) {
    const safeTitle = normalizeTitle(name, title)
    const safeSubtitle = normalizeSubtitle(state, subtitle)
    const disabled = state === 'disabled' || state === 'loading'

    return (
      <article className={`ds-component ds-component--${state}`} aria-disabled={disabled}>
        <div className="ds-component__head">
          <strong className="ds-text-label">{safeTitle}</strong>
          <span className={`ds-badge ds-badge--${state}`}>{stateLabelMap[state]}</span>
        </div>
        <p className="ds-text-body-small">{safeSubtitle}</p>
        <button type="button" className="ds-button" disabled={disabled}>
          {state === 'loading' ? 'Loading' : cta}
        </button>
      </article>
    )
  }
}
