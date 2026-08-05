import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import { ApiClientError } from '../lib/apiClient.js'

/**
 * @param {{
 *   error: unknown
 *   onRetry?: () => void
 *   retrying?: boolean
 *   title?: string
 * }} props
 */
export default function ApiTimeoutPanel({ error, onRetry, retrying = false, title }) {
  const isTimeout = error instanceof ApiClientError && error.kind === 'timeout'
  const isNetwork = error instanceof ApiClientError && error.kind === 'network'
  const message = formatApiErrorMessage(error)

  return (
    <div className="mos-api-timeout-panel" role="alert">
      <h2 className="mos-api-timeout-panel__title">
        {title ?? (isTimeout ? 'İstek zaman aşımı' : isNetwork ? 'Bağlantı hatası' : 'API hatası')}
      </h2>
      <p className="mos-api-timeout-panel__body">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mos-btn mos-btn-primary mos-btn-sm"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? 'Yeniden deneniyor…' : 'Tekrar dene'}
        </button>
      ) : null}
    </div>
  )
}
