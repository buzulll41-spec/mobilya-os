import { useState } from 'react'
import { useAuth } from '../state/AuthProvider.jsx'
import { ApiClientError } from '../lib/apiClient.js'
import { APP_NAME } from '../constants/app.js'
import { DEMO_ACCOUNT_HINTS, formatDemoAccountsHint } from '../constants/demoAccounts.js'
import MosButton from '../components/MosButton.jsx'
import '../styles/login-page.css'

/** @param {unknown} err */
function isSilentLoginNetworkError(err) {
  if (err instanceof ApiClientError) {
    return err.kind === 'network' || err.kind === 'timeout'
  }
  if (err instanceof Error) {
    return /failed to fetch|network request failed|request aborted|networkerror/i.test(err.message)
  }
  return false
}

/**
 * @param {{ onLoggedIn?: () => void }} props
 */
export default function LoginPage({ onLoggedIn }) {
  const { login, sessionMessage, clearSessionMessage } = useAuth()
  const [email, setEmail] = useState('ops@mobilya.local')
  const [password, setPassword] = useState('ops123')
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      onLoggedIn?.()
    } catch (err) {
      if (isSilentLoginNetworkError(err)) {
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Giriş başarısız')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={(e) => void handleSubmit(e)}>
        <h1 className="login-card__title">{APP_NAME}</h1>
        <p className="login-card__sub">Mağaza operasyon girişi</p>
        {sessionMessage ? (
          <p className="login-card__session" role="status">
            {sessionMessage}
            <button type="button" className="login-card__session-dismiss" onClick={clearSessionMessage}>
              Kapat
            </button>
          </p>
        ) : null}
        <label className="login-field">
          <span>E-posta</span>
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            enterKeyHint="next"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ornek@mobilya.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />        </label>
        <label className="login-field">
          <span>Şifre</span>
          <input
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            placeholder="demo şifresi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />        </label>
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <MosButton type="submit" context="head" tone="primary" label="Giriş yap" disabled={submitting} className="login-submit">
          {submitting ? 'Giriş…' : 'Giriş yap'}
        </MosButton>
        <p className="login-hint">
          Demo hesapları (@mobilya.local):
          <br />
          {formatDemoAccountsHint()}
        </p>
        <ul className="login-hint-list" aria-label="Demo hesap kısayolları">
          {DEMO_ACCOUNT_HINTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="login-hint-btn"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setError(null)
                }}
              >
                {account.label}: {account.email}
              </button>
            </li>
          ))}
        </ul>      </form>
    </div>
  )
}
