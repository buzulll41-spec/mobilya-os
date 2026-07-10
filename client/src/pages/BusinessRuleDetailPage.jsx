import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBusinessRuleDetail, updateBusinessRule } from '../services/businessRuleClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import '../styles/mos-erp-ops.css'

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function BusinessRuleDetailPage({ ruleId, onBack, onNavigate }) {
  const [rule, setRule] = useState(null)
  const [value, setValue] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [busy, setBusy] = useState(false)

  const canEdit = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'ADMIN' || role === 'MANAGER' || role === 'admin' || role === 'manager'
  }, [])

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    getBusinessRuleDetail(ruleId)
      .then((r) => {
        if (!alive) return
        setRule(r)
        setValue(r.value)
        setEnabled(r.isEnabled)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Kural yüklenemedi')
        setLoading(false)
      })
    return () => { alive = false }
  }, [ruleId])

  useEffect(() => load(), [load])

  async function save() {
    if (!canEdit) return
    setBusy(true)
    setSaveError(null)
    try {
      await updateBusinessRule(ruleId, { value, isEnabled: enabled })
      load()
    } catch (err) {
      setSaveError(err?.body?.message ?? err?.message ?? 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>
  if (error || !rule) return <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error ?? 'Kural bulunamadı'}</span></div>

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <button type="button" className="mos-erp-detail__action" onClick={onBack}>← Listeye Dön</button>
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">{rule.name}</h1>
          <span className="mos-erp-ops__sub">{rule.code} · {rule.valueType}</span>
        </div>
      </header>

      <div className="mos-erp-detail">
        <div className="mos-erp-detail__grid">
          <div className="mos-erp-detail__body">
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Açıklama</span>
              <span className="mos-erp-detail__field-value">{rule.description}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Kategori</span>
              <span className="mos-erp-detail__field-value">{rule.category}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Önem</span>
              <Tag tone={rule.severity === 'CRITICAL' ? 'critical' : rule.severity === 'WARNING' ? 'warning' : 'info'}>{rule.severity}</Tag>
            </div>
            {canEdit ? (
              <>
                <div className="mos-erp-detail__field">
                  <span className="mos-erp-detail__field-label">Değer</span>
                  {rule.valueType === 'BOOLEAN' ? (
                    <select className="mos-erp-filters__field" value={value} onChange={(e) => setValue(e.target.value)}>
                      <option value="true">Evet (true)</option>
                      <option value="false">Hayır (false)</option>
                    </select>
                  ) : (
                    <input type="text" className="mos-erp-filters__field" value={value} onChange={(e) => setValue(e.target.value)} />
                  )}
                </div>
                <div className="mos-erp-detail__field">
                  <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Aktif</label>
                </div>
              </>
            ) : (
              <>
                <div className="mos-erp-detail__field">
                  <span className="mos-erp-detail__field-label">Değer</span>
                  <span className="mos-erp-detail__field-value">{rule.value}</span>
                </div>
                <div className="mos-erp-detail__field">
                  <span className="mos-erp-detail__field-label">Durum</span>
                  <span className="mos-erp-detail__field-value">{rule.isEnabled ? 'Aktif' : 'Pasif'}</span>
                </div>
              </>
            )}
          </div>
          <div className="mos-erp-detail__actions">
            {canEdit && (
              <button type="button" className="mos-erp-detail__action mos-erp-detail__action--primary" disabled={busy} onClick={save}>Kaydet</button>
            )}
            {onNavigate && (
              <button type="button" className="mos-erp-detail__action" onClick={() => onNavigate('business-rule-tester', { code: rule.code, value })}>
                Simüle Et
              </button>
            )}
          </div>
        </div>
        {saveError && <p className="mos-erp-ops__alert">{saveError}</p>}
        {!canEdit && <p className="mos-erp-ops__sub">Salt okunur görünüm (OPERATION rolü).</p>}
      </div>
    </div>
  )
}
