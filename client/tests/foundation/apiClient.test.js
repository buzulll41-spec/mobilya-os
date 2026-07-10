import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiClientError,
  createApiClient,
  parseJsonSafely,
} from '../../src/lib/apiClient.js'

describe('apiClient', () => {
  /** @type {typeof fetch | undefined} */
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('network fail → ApiClientError (network)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const client = createApiClient('http://localhost:4000', { fetch: fetchMock, timeoutMs: 5_000 })

    await expect(client.get('/v1/orders')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'network',
      message: 'Failed to fetch',
      method: 'GET',
      url: 'http://localhost:4000/v1/orders',
    })
  })

  it('non-json response → ApiClientError (parse)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html>not json</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    )
    const client = createApiClient('http://localhost:4000', { fetch: fetchMock })

    await expect(client.get('/v1/orders')).rejects.toMatchObject({
      kind: 'parse',
      message: 'Expected JSON response',
      rawBody: '<html>not json</html>',
    })
  })

  it('timeout → ApiClientError (timeout)', async () => {
    const fetchMock = vi.fn((_url, init) => {
      return new Promise((_resolve, reject) => {
        if (init.signal?.aborted) {
          reject(init.signal.reason)
          return
        }
        init.signal?.addEventListener('abort', () => {
          reject(init.signal.reason ?? new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const client = createApiClient('http://localhost:4000', { fetch: fetchMock, timeoutMs: 50 })

    await expect(client.get('/v1/orders')).rejects.toMatchObject({
      kind: 'timeout',
      message: 'Request timed out after 50ms',
    })
  })

  it('500 response → normalized ApiClientError (http)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, error: 'Internal Server Error' }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const client = createApiClient('http://localhost:4000', { fetch: fetchMock })

    try {
      await client.get('/v1/orders')
      expect.fail('should throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError)
      expect(err.kind).toBe('http')
      expect(err.status).toBe(500)
      expect(err.statusText).toBe('Internal Server Error')
      expect(err.message).toBe('HTTP 500: Internal Server Error')
      expect(err.body).toEqual({ statusCode: 500, error: 'Internal Server Error' })
      expect(err.toJSON()).toMatchObject({
        kind: 'http',
        status: 500,
        body: { statusCode: 500, error: 'Internal Server Error' },
      })
    }
  })

  it('parseJsonSafely invalid JSON', () => {
    const result = parseJsonSafely('{not-json', 'application/json')
    expect(result.error).toBeInstanceOf(ApiClientError)
    expect(result.error?.kind).toBe('parse')
  })
})
