import { Component } from 'react'

/**
 * Alt bölüm hatasında tüm sayfayı düşürmez; sadece ilgili paneli gösterir.
 */
export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    const { label = 'Bölüm', children } = this.props

    if (error) {
      return (
        <div className="mos-api-error" style={{ margin: '0.35rem 0' }} role="alert">
          <p className="mos-api-error-text">
            {label} yüklenemedi: {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            type="button"
            className="mos-btn mos-btn-ghost mos-btn-sm"
            onClick={() => this.setState({ error: null })}
          >
            Tekrar dene
          </button>
        </div>
      )
    }

    return children
  }
}
