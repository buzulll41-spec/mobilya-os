import { logApiFetchError } from './logApiFetchError.js'

/** @typedef {'network' | 'timeout' | 'http' | 'parse'} ApiErrorKind */

/**
 * @typedef {Object} ApiClientErrorPayload
 * @property {ApiErrorKind} kind
 * @property {string} message
 * @property {string} [method]
 * @property {string} [url]
 * @property {number} [status]
 * @property {string} [statusText]
 * @property {unknown} [body]
 * @property {string} [rawBody]
 * @property {unknown} [cause]
 */

export const DEFAULT_TIMEOUT_MS = 15_000

/** @param {string} baseUrl */
export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/, '')
}

/** @param {string} baseUrl @param {string} path */
export function resolveApiUrl(baseUrl, path) {
  const root = normalizeBaseUrl(baseUrl)
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${root}${suffix}`
}

export class ApiClientError extends Error {
  /** @param {ApiClientErrorPayload} payload */
  constructor(payload) {
    super(payload.message)
    this.name = 'ApiClientError'
    this.kind = payload.kind
    this.method = payload.method
    this.url = payload.url
    this.status = payload.status
    this.statusText = payload.statusText
    this.body = payload.body
    this.rawBody = payload.rawBody
    this.cause = payload.cause
  }

  /** @returns {ApiClientErrorPayload} */
  toJSON() {
    return {
      kind: this.kind,
      message: this.message,
      method: this.method,
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      body: this.body,
      rawBody: this.rawBody,
    }
  }
}

/**
 * @param {string} text
 * @param {string} contentType
 * @returns {{ data: unknown, rawBody: string } | { error: ApiClientError }}
 */
export function parseJsonSafely(text, contentType) {
  const trimmed = text.trim()
  if (!trimmed) {
    return { data: null, rawBody: text }
  }

  const looksJson =
    contentType.includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[')

  if (!looksJson) {
    return {
      error: new ApiClientError({
        kind: 'parse',
        message: 'Expected JSON response',
        rawBody: text,
      }),
    }
  }

  try {
    return { data: JSON.parse(text), rawBody: text }
  } catch (cause) {
    return {
      error: new ApiClientError({
        kind: 'parse',
        message: 'Invalid JSON response',
        rawBody: text,
        cause,
      }),
    }
  }
}

/**
 * @param {Response} res
 * @param {string} method
 * @param {string} url
 * @param {boolean} expectJson
 */
async function readResponseBody(res, method, url, expectJson) {
  const text = await res.text()
  if (!expectJson) {
    return { data: text, rawBody: text }
  }

  const parsed = parseJsonSafely(text, res.headers.get('content-type') ?? '')
  if (parsed.error) {
    parsed.error.method = method
    parsed.error.url = url
    throw parsed.error
  }
  return { data: parsed.data, rawBody: parsed.rawBody }
}

/**
 * @param {string} baseUrl
 * @param {{
 *   timeoutMs?: number
 *   fetch?: typeof fetch
 *   headers?: Record<string, string>
 * }} [options]
 */
export function createApiClient(baseUrl, options = {}) {
  const root = normalizeBaseUrl(baseUrl)
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchFn = options.fetch ?? globalThis.fetch
  const defaultHeaders = options.headers ?? {}

  /**
   * @param {string} method
   * @param {string} path
   * @param {{
   *   body?: unknown
   *   headers?: Record<string, string>
   *   timeoutMs?: number
   *   expectJson?: boolean
   *   signal?: AbortSignal
   * }} [reqOptions]
   */
  async function request(method, path, reqOptions = {}) {
    const url = resolveApiUrl(root, path)
    try {
      return await executeRequest(method, url, reqOptions)
    } catch (err) {
      logApiFetchError(err, method, url)
      throw err
    }
  }

  /**
   * @param {string} method
   * @param {string} url
   * @param {{
   *   body?: unknown
   *   headers?: Record<string, string>
   *   timeoutMs?: number
   *   expectJson?: boolean
   *   signal?: AbortSignal
   * }} reqOptions
   */
  async function executeRequest(method, url, reqOptions = {}) {
    const expectJson =
      reqOptions.expectJson ??
      (method === 'GET' ||
        method === 'DELETE' ||
        method === 'POST' ||
        method === 'PUT' ||
        method === 'PATCH')
    const timeoutMs = reqOptions.timeoutMs ?? defaultTimeoutMs
    const headers = {
      Accept: 'application/json',
      ...defaultHeaders,
      ...reqOptions.headers,
    }

    /** @type {RequestInit} */
    const init = { method, headers, signal: reqOptions.signal, cache: 'no-store' }

    if (reqOptions.body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
      init.body = JSON.stringify(reqOptions.body)
    }

    const controller = new AbortController()
    if (reqOptions.signal) {
      if (reqOptions.signal.aborted) {
        controller.abort(reqOptions.signal.reason)
      } else {
        reqOptions.signal.addEventListener('abort', () => controller.abort(reqOptions.signal.reason), {
          once: true,
        })
      }
    }

    const timeoutId = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs)

    let res
    try {
      res = await fetchFn(url, { ...init, signal: controller.signal })
    } catch (cause) {
      const isTimeout =
        cause instanceof Error &&
        (cause.message === 'Timeout' || cause.name === 'TimeoutError')
      if (isTimeout) {
        throw new ApiClientError({
          kind: 'timeout',
          message: `Request timed out after ${timeoutMs}ms`,
          method,
          url,
          cause,
        })
      }
      const isAbort =
        (cause instanceof DOMException && cause.name === 'AbortError') ||
        (cause instanceof Error && cause.name === 'AbortError')
      if (isAbort) {
        throw new ApiClientError({
          kind: 'network',
          message: 'Request aborted',
          method,
          url,
          cause,
        })
      }
      throw new ApiClientError({
        kind: 'network',
        message: cause instanceof Error ? cause.message : 'Network request failed',
        method,
        url,
        cause,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const { data, rawBody } = await readResponseBody(res, method, url, expectJson)

    if (!res.ok) {
      const authHeader = headers.Authorization ?? headers.authorization
      const sentBearer =
        typeof authHeader === 'string' && authHeader.trim().toLowerCase().startsWith('bearer ')
      const isLoginRoute = url.includes('/v1/auth/login')
      if (
        res.status === 401 &&
        sentBearer &&
        !isLoginRoute &&
        typeof globalThis !== 'undefined' &&
        globalThis.dispatchEvent
      ) {
        const bodyMsg =
          data &&
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof /** @type {{ message: unknown }} */ (data).message === 'string'
            ? /** @type {{ message: string }} */ (data).message
            : 'Oturum süresi doldu veya oturum geçersiz'
        globalThis.dispatchEvent(
          new CustomEvent('mobilya:auth-expired', { detail: { message: bodyMsg } }),
        )
      }
      throw new ApiClientError({
        kind: 'http',
        message: `HTTP ${res.status}: ${res.statusText}`.trim(),
        method,
        url,
        status: res.status,
        statusText: res.statusText,
        body: data,
        rawBody,
      })
    }

    return data
  }

  return {
    get: (path, reqOptions) => request('GET', path, reqOptions),
    post: (path, body, reqOptions = {}) => request('POST', path, { ...reqOptions, body }),
    put: (path, body, reqOptions = {}) => request('PUT', path, { ...reqOptions, body }),
    patch: (path, body, reqOptions = {}) => request('PATCH', path, { ...reqOptions, body }),
    delete: (path, reqOptions) => request('DELETE', path, reqOptions),
  }
}
