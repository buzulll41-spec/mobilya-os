import { APP_MODE, getAppMode, getEnvAppMode, isRuntimeModeAllowed } from './appMode.js'
import { getApiBaseUrl, isLocalhostApiBase } from './dataSource.js'

/**
 * Production Shield — uygulama açılışında (bootstrap) production veri kaynağını
 * kesin olarak doğrular. Fail-open KULLANILMAZ: production yanlış yapılandırılmışsa
 * uygulama sessizce açılmaz.
 *
 * Guard yalnızca ENV mode production ise devreye girer (gerçek production DEPLOY).
 * Demo/development davranışı DEĞİŞMEZ. Cihaz-bağımsızdır: desktop/tablet/telefon
 * aynı bootstrap sonucunu kullanır (tek yol).
 *
 * @typedef {'ok' | 'runtime_override' | 'missing_api' | 'localhost_api'} ProductionShieldCode
 * @typedef {{ ok: boolean, code: ProductionShieldCode, production: boolean }} ProductionShieldResult
 */

/** @returns {ProductionShieldResult} */
export function evaluateProductionShield() {
  // Yalnızca production DEPLOY'unda (env mode) devreye girer.
  if (getEnvAppMode() !== APP_MODE.PRODUCTION) {
    return { ok: true, code: 'ok', production: false }
  }

  // Runtime override (localStorage/sessionStorage/query) production guard'ını aşamaz.
  // Production'da mod değiştirmeye izin veren bayrak açık olamaz.
  if (isRuntimeModeAllowed() || getAppMode() !== APP_MODE.PRODUCTION) {
    return { ok: false, code: 'runtime_override', production: true }
  }

  // Eksik/boş API adresi = mock/demo/memory/local fallback → engelle.
  if (!getApiBaseUrl()) {
    return { ok: false, code: 'missing_api', production: true }
  }

  // localhost/loopback API production'da kullanılamaz.
  if (isLocalhostApiBase()) {
    return { ok: false, code: 'localhost_api', production: true }
  }

  return { ok: true, code: 'ok', production: true }
}

/**
 * Kontrollü log — yalnızca hata KODU yazılır. Secret veya değişken DEĞERİ loglanmaz.
 * @param {ProductionShieldResult} result
 * @returns {void}
 */
export function logProductionShield(result) {
  if (result.ok) return
  if (typeof console !== 'undefined' && console.error) {
    console.error(`[production-shield] blocked: ${result.code}`)
  }
}
