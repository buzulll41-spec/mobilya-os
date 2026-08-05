import { useState } from 'react'
import { useAuth } from '../state/AuthProvider.jsx'
import { ApiClientError } from '../lib/apiClient.js'
import { DEMO_ACCOUNT_HINTS, formatDemoAccountsHint } from '../constants/demoAccounts.js'
import {
  Alert,
  Divider,
  GhostButton,
  PasswordInput,
  TextInput,
} from '../components/design-system/DSComponents.jsx'
import { IconChevronRight } from '../components/Icons.jsx'
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

function FaceIdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10a4 4 0 0 1 8 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9.5 17c.7.6 1.6 1 2.5 1s1.8-.4 2.5-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function LoginSubmitButton({ block, loading, className = '', type = 'button', children, ...rest }) {
  return (
    <button
      {...rest}
      type={type}
      className={['ds-button', 'ds-button--primary', block ? 'ds-button--block' : '', className]
        .filter(Boolean)
        .join(' ')}
      disabled={Boolean(rest.disabled) || Boolean(loading)}
      aria-busy={loading || undefined}
    >
      <span className="ds-button__label">{children}</span>
    </button>
  )
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
  const [showLoginForm, setShowLoginForm] = useState(false)

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

  if (!showLoginForm) {
    return (
      <div className="auth-shell auth-shell--welcome">
        <div className="auth-shell__ambient" aria-hidden>
          <div className="auth-shell__blur auth-shell__blur--top" />
          <div className="auth-shell__blur auth-shell__blur--bottom" />
        </div>

        <main className="auth-welcome">
          <section className="auth-welcome__content">
            <header className="auth-brand" aria-label="evtrend markasi">
              <h1 className="auth-brand__wordmark">evtrend</h1>
              <p className="auth-brand__subtitle">Operasyon Merkezi</p>
            </header>

            <div className="auth-welcome__copy">
              <p className="auth-welcome__greeting">Hoş geldin,</p>
              <h2 className="auth-welcome__name">Murat Aydın 👋</h2>
              <p className="auth-welcome__lead">Bugün seni bekleyen işler hazır.</p>
            </div>

            <div className="auth-welcome__actions">
              <button type="button" className="auth-btn auth-btn--primary" onClick={() => setShowLoginForm(true)}>
                <span className="auth-btn__icon" aria-hidden>
                  <FaceIdIcon />
                </span>
                <span>Face ID ile Devam Et</span>
              </button>

              <button type="button" className="auth-btn auth-btn--secondary" onClick={() => setShowLoginForm(true)}>
                Şifre ile giriş yap
              </button>
            </div>
          </section>
        </main>

        <footer className="auth-shell__footer">
          <button
            type="button"
            className="auth-switch-account"
            onClick={() => {
              setShowLoginForm(true)
              setError(null)
            }}
          >
            <span className="auth-switch-account__icon" aria-hidden>
              <IconChevronRight />
            </span>
            <span>Başka hesapla giriş yap</span>
          </button>
        </footer>
      </div>
    )
  }

  return (
    <div className="auth-shell auth-shell--login">
      <div className="auth-shell__ambient" aria-hidden>
        <div className="auth-shell__blur auth-shell__blur--top" />
        <div className="auth-shell__blur auth-shell__blur--bottom" />
      </div>

      <main className="auth-login">
        <section className="auth-login__intro">
          <div className="auth-login__heading">
            <h1 className="auth-brand__wordmark">evtrend</h1>
            <p className="auth-brand__subtitle">Operasyon Merkezi</p>
          </div>
          <button type="button" className="auth-login__back" onClick={() => setShowLoginForm(false)}>
            Geri
          </button>
        </section>

        <form className="auth-login__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="auth-login__form-head">
            <h2>Şifre ile giriş yap</h2>
            <p>Hesabınla giriş yap ve devam et.</p>
          </div>
          {sessionMessage ? (
            <Alert
              tone="warning"
              className="auth-login__notification"
              action={
                <GhostButton type="button" className="auth-login__dismiss" onClick={clearSessionMessage}>
                  Kapat
                </GhostButton>
              }
            >
              {sessionMessage}
            </Alert>
          ) : null}
          <TextInput
            className="auth-login__field"
            label="E-posta"
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
          />
          <PasswordInput
            className="auth-login__field"
            label="Şifre"
            autoComplete="current-password"
            enterKeyHint="go"
            placeholder="demo şifresi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? (
            <Alert tone="danger" className="auth-login__error">{error}</Alert>
          ) : null}
          <LoginSubmitButton type="submit" block loading={submitting} className="auth-login__submit">
            {submitting ? 'Giriş…' : 'Giriş Yap'}
          </LoginSubmitButton>
          <Divider className="auth-login__divider" />
          <p className="auth-login__hint ds-caption">
            Demo hesapları (@mobilya.local):
            <br />
            {formatDemoAccountsHint()}
          </p>
          <ul className="auth-login__hint-list" aria-label="Demo hesap kısayolları">
            {DEMO_ACCOUNT_HINTS.map((account) => (
              <li key={account.email}>
                <GhostButton
                  type="button"
                  block
                  className="auth-login__hint-button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(account.password)
                    setError(null)
                  }}
                >
                  {account.label}: {account.email}
                </GhostButton>
              </li>
            ))}
          </ul>
        </form>
      </main>
    </div>
  )
}
