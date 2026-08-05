import { createAuthedApiClient } from '../lib/operationActor.js'

export async function fetchBusinessRulesFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['category', 'q', 'enabled']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/admin/business-rules?${qs}` : '/v1/admin/business-rules')
}

export async function fetchBusinessRuleDetailFromApi(base, id) {
  const client = createAuthedApiClient(base)
  return client.get(`/v1/admin/business-rules/${encodeURIComponent(id)}`)
}

export async function patchBusinessRuleOnApi(base, id, patch) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/admin/business-rules/${encodeURIComponent(id)}`, patch)
}

export async function postBusinessRuleTestOnApi(base, body) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/admin/business-rules/test', body)
}
