import { ApiClientError } from '../lib/apiClient.js'
import { MOBILE_API_UNAVAILABLE_MESSAGE } from '../contracts/v1/mobilePwa.js'

/** @param {string | undefined} url */
function isLocalBackendUrl(url) {
  if (!url) return false
  return /localhost:4000|127\.0\.0\.1:4000/.test(url)
}

/**
 * @param {unknown} body
 */
function httpErrorDetail(body) {
  if (!body || typeof body !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (body)
  if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
  return null
}

/**
 * Tedarik onayı — oturum / yetki hatalarında kullanıcı dostu mesaj.
 * @param {unknown} err
 * @returns {string}
 */
export function formatSupplyConfirmError(err) {
  if (err instanceof ApiClientError && err.kind === 'http') {
    if (err.status === 401 || err.status === 403) {
      return 'Tedarik gönderimi onaylanamadı. Yetkiniz yok veya oturum süreniz dolmuş olabilir.'
    }
  }
  return formatApiErrorMessage(err)
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatApiErrorMessage(err) {
  if (err instanceof ApiClientError) {
    if (err.kind === 'timeout') return 'İstek zaman aşımına uğradı. Tekrar deneyin.'

    if (err.kind === 'network') {
      const causeMsg =
        err.cause instanceof Error
          ? err.cause.message
          : typeof err.cause === 'string'
            ? err.cause
            : ''
      const isFetchBlocked =
        /failed to fetch/i.test(causeMsg) ||
        /networkerror/i.test(causeMsg) ||
        /fetch failed/i.test(causeMsg) ||
        /failed to fetch/i.test(err.message)

      if (isFetchBlocked && err.method === 'PATCH' && isLocalBackendUrl(err.url)) {
        return 'PATCH isteği tarayıcıda engellendi (çoğunlukla CORS). Backend’i yeniden başlatın; CORS’ta PATCH izinli olmalı.'
      }

      if (isFetchBlocked && isLocalBackendUrl(err.url)) {
        return 'Backend çalışmıyor (http://localhost:4000). backend klasöründe `npm run dev` çalıştırın; PostgreSQL için `docker compose up -d`.'
      }

      if (isFetchBlocked) {
        return MOBILE_API_UNAVAILABLE_MESSAGE
      }

      return 'API sunucusuna bağlanılamadı. Ağ bağlantısını kontrol edin.'
    }

    if (err.kind === 'http') {
      const detail = httpErrorDetail(err.body)
      const validationHint =
        detail &&
        (/additional properties|must match|validation/i.test(detail) ||
          (err.body &&
            typeof err.body === 'object' &&
            'validation' in /** @type {object} */ (err.body)))

      if (err.status === 400 && validationHint) {
        if (err.method === 'POST' && err.url?.includes('/v1/orders')) {
          return 'Gönderilen sipariş formatı backend ile uyumsuz. Sayfayı yenileyip tekrar deneyin.'
        }
        return detail
          ? `Sipariş bilgilerini kontrol edin: ${detail}`
          : 'Sipariş bilgilerini kontrol edin.'
      }

      if (detail) {
        if (err.status === 503) {
          return `${detail} (PostgreSQL: backend klasöründe docker compose up -d)`
        }
        return detail
      }

      return err.message || `HTTP ${err.status ?? ''}`.trim()
    }

    if (err.kind === 'parse') return 'Sunucu yanıtı okunamadı.'
  }

  if (err instanceof Error) return err.message
  return 'Beklenmeyen bir hata oluştu.'
}
