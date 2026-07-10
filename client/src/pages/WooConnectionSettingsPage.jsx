import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import { getDataSourceDisplay } from '../config/dataSource.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import * as wooConnectionClient from '../services/wooConnectionClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import '../styles/mos-erp-ops.css'
import '../styles/woo-connection-settings.css'

/** @typedef {import('../contracts/v1/wooConnection.js').WooConnectionDto} WooConnectionDto */
/** @typedef {import('../contracts/v1/wooConnection.js').WooConnectionTestResponseDto} WooConnectionTestResponseDto */

/**
 * @param {'CONNECTED' | 'ERROR' | 'UNCHECKED'} status
 */
function statusTone(status) {
  if (status === 'CONNECTED') return 'success'
  if (status === 'ERROR') return 'critical'
  return 'neutral'
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function WooConnectionSettingsPage({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [connection, setConnection] = useState(/** @type {WooConnectionDto | null} */ (null))
  const [testResult, setTestResult] = useState(
    /** @type {WooConnectionTestResponseDto['test'] | null} */ (null),
  )
  const [form, setForm] = useState({
    storeName: '',
    storeUrl: '',
    consumerKey: '',
    consumerSecret: '',
    isActive: true,
  })

  const canWrite = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'ADMIN' || role === 'MANAGER'
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const row = await wooConnectionClient.getWooConnection()
      setConnection(row)
      if (row) {
        setForm({
          storeName: row.storeName,
          storeUrl: row.storeUrl,
          consumerKey: row.consumerKeyMasked,
          consumerSecret: row.consumerSecretMasked,
          isActive: row.isActive,
        })
      }
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(id)
  }, [load])

  const healthMetrics = useMemo(() => {
    const status = testResult?.status ?? connection?.lastConnectionStatus ?? 'UNCHECKED'
    const label = testResult?.statusLabel ?? connection?.lastConnectionStatusLabel ?? 'Kontrol edilmedi'
    return [
      {
        id: 'status',
        label: 'Bağlantı Durumu',
        value: label,
        valueTone: statusTone(status),
      },
      {
        id: 'categories',
        label: 'Kategori Sayısı',
        value: testResult ? String(testResult.categoryCount) : '—',
      },
      {
        id: 'products',
        label: 'Ürün Sayısı',
        value: testResult ? String(testResult.productCount) : '—',
      },
      {
        id: 'wc-version',
        label: 'Woo Sürümü',
        value: testResult?.storeInfo?.wcVersion ?? '—',
      },
    ]
  }, [connection, testResult])

  async function handleSave() {
    if (!canWrite) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        storeName: form.storeName.trim(),
        storeUrl: form.storeUrl.trim(),
        consumerKey: form.consumerKey.trim(),
        isActive: form.isActive,
      }
      if (form.consumerSecret.trim()) {
        payload.consumerSecret = form.consumerSecret.trim()
      }
      const saved = await wooConnectionClient.saveWooConnection(payload)
      setConnection(saved)
      setForm((prev) => ({
        ...prev,
        consumerKey: saved.consumerKeyMasked,
        consumerSecret: saved.consumerSecretMasked,
      }))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!canWrite) return
    setTesting(true)
    setError(null)
    try {
      const res = await wooConnectionClient.testWooConnection()
      setConnection(res.connection)
      setTestResult(res.test)
      setForm((prev) => ({
        ...prev,
        consumerKey: res.connection.consumerKeyMasked,
        consumerSecret: res.connection.consumerSecretMasked,
      }))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <LoadingBlock title="WooCommerce ayarları yükleniyor" hint="Mağaza bağlantı yapılandırması" />
  }

  return (
    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--woo-settings'
          : 'mos-page mos-erp-ops mos-erp-ops--woo-settings'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">WooCommerce Ayarları</h1>
            <span className="mos-erp-ops__sub">
              EVTREND mağaza bağlantısı · salt okunur API testi · {getDataSourceDisplay().label}
            </span>
          </div>
        </header>
      ) : null}

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      <ErpOpsSummaryStrip
        metrics={healthMetrics}
        ariaLabel="WooCommerce bağlantı sağlığı"
        summaryClassName="mos-erp-summary--cols-4"
      />

      <div className="mos-woo-settings__grid">
        <section className="mos-woo-settings__panel" aria-label="Bağlantı ayarları">
          <h2 className="mos-woo-settings__title">Mağaza Bağlantısı</h2>
          <p className="mos-woo-settings__hint">
            Tek mağaza destekli. Consumer Key ve Secret maskelenir; loglara veya API yanıtına tam
            değer dönmez.
          </p>

          <label className="mos-woo-settings__field">
            <span>Mağaza Adı</span>
            <input
              type="text"
              value={form.storeName}
              disabled={!canWrite || saving || testing}
              onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value }))}
            />
          </label>

          <label className="mos-woo-settings__field">
            <span>Mağaza URL</span>
            <input
              type="url"
              placeholder="https://evtrend.com"
              value={form.storeUrl}
              disabled={!canWrite || saving || testing}
              onChange={(e) => setForm((p) => ({ ...p, storeUrl: e.target.value }))}
            />
          </label>

          <label className="mos-woo-settings__field">
            <span>Consumer Key</span>
            <input
              type="text"
              autoComplete="off"
              value={form.consumerKey}
              disabled={!canWrite || saving || testing}
              onChange={(e) => setForm((p) => ({ ...p, consumerKey: e.target.value }))}
            />
          </label>

          <label className="mos-woo-settings__field">
            <span>Consumer Secret</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={connection ? 'Değiştirmek için yeni secret girin' : 'Consumer Secret'}
              value={form.consumerSecret}
              disabled={!canWrite || saving || testing}
              onChange={(e) => setForm((p) => ({ ...p, consumerSecret: e.target.value }))}
            />
          </label>

          <label className="mos-woo-settings__checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={!canWrite || saving || testing}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Aktif bağlantı
          </label>

          {canWrite ? (
            <div className="mos-woo-settings__actions">
              <button
                type="button"
                className="mos-erp-ops__btn mos-erp-ops__btn--primary"
                disabled={saving || testing}
                onClick={() => void handleSave()}
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                type="button"
                className="mos-erp-ops__btn"
                disabled={saving || testing || !connection}
                onClick={() => void handleTest()}
              >
                {testing ? 'Test ediliyor…' : 'Bağlantıyı Test Et'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="mos-woo-settings__panel" aria-label="Bağlantı durumu">
          <h2 className="mos-woo-settings__title">Durum</h2>
          <dl className="mos-woo-settings__kv">
            <div>
              <dt>Durum</dt>
              <dd>{connection?.lastConnectionStatusLabel ?? 'Kontrol edilmedi'}</dd>
            </div>
            <div>
              <dt>Son Kontrol</dt>
              <dd>
                {connection?.lastConnectionCheck
                  ? new Date(connection.lastConnectionCheck).toLocaleString('tr-TR')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Son Hata</dt>
              <dd>{connection?.lastError ?? testResult?.error ?? '—'}</dd>
            </div>
            <div>
              <dt>Mağaza URL</dt>
              <dd>{connection?.storeUrl ?? (form.storeUrl || '—')}</dd>
            </div>
          </dl>

          {testResult?.productsSample?.length ? (
            <>
              <h3 className="mos-woo-settings__subtitle">İlk {testResult.productsSample.length} ürün</h3>
              <ul className="mos-woo-settings__sample-list">
                {testResult.productsSample.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    <span>
                      {p.sku || '—'} · {p.status} · {p.price || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {testResult?.categoriesSample?.length ? (
            <>
              <h3 className="mos-woo-settings__subtitle">Kategori örneği</h3>
              <ul className="mos-woo-settings__sample-list">
                {testResult.categoriesSample.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong>
                    <span>
                      {c.slug} · {c.count} ürün
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}
