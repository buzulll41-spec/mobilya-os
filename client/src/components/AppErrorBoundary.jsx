import { Component } from 'react'
import { recordErrorCenterEntry } from '../lib/errorCenterStore.js'

/**
 * Global hata sınırı — tam beyaz ekranı önler.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[AppErrorBoundary]', error, info)
    }
    recordErrorCenterEntry({
      category: 'boundary',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      pageId: typeof window !== 'undefined' ? window.location.hash : undefined,
    })
  }

  render() {
    if (this.state.error) {
      const message =
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
      return (
        <div className="mos-api-error mos-api-timeout-panel" style={{ margin: '2rem' }} role="alert">
          <h2 className="mos-api-timeout-panel__title">Beklenmeyen bir hata oluştu</h2>
          <p className="mos-api-error-text mos-api-timeout-panel__body">{message}</p>
          <button
            type="button"
            className="mos-btn mos-btn-primary mos-btn-sm"
            onClick={() => window.location.reload()}
          >
            Sayfayı yenile
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
