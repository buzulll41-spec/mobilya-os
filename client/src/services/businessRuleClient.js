import { getApiBaseUrl } from '../config/dataSource.js'
import {
  fetchBusinessRuleDetailFromApi,
  fetchBusinessRulesFromApi,
  patchBusinessRuleOnApi,
  postBusinessRuleTestOnApi,
} from './realBusinessRuleApi.js'
import {
  mockGetBusinessRuleDetail,
  mockGetBusinessRules,
  mockPatchBusinessRule,
  mockPostBusinessRuleTest,
} from './mockBusinessRuleApi.js'

export async function getBusinessRules(query) {
  const base = getApiBaseUrl()
  if (base) return fetchBusinessRulesFromApi(base, query)
  return mockGetBusinessRules(query)
}

export async function getBusinessRuleDetail(id) {
  const base = getApiBaseUrl()
  if (base) return fetchBusinessRuleDetailFromApi(base, id)
  return mockGetBusinessRuleDetail(id)
}

export async function updateBusinessRule(id, patch) {
  const base = getApiBaseUrl()
  if (base) return patchBusinessRuleOnApi(base, id, patch)
  return mockPatchBusinessRule(id, patch)
}

export async function testBusinessRule(body) {
  const base = getApiBaseUrl()
  if (base) return postBusinessRuleTestOnApi(base, body)
  return mockPostBusinessRuleTest(body)
}
