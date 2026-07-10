/**
 * FAZ 40 — Versioned prompt registry per AI worker.
 */

export type PromptTemplate = {
  version: string
  workerId: string
  system: string
  userTemplate: string
  outputSchema: string
}

const OUTPUT_SCHEMA = `{
  "orderId": "string",
  "customerName": "string",
  "phone": "string",
  "priority": "LOW|NORMAL|HIGH|CRITICAL",
  "score": 0-100,
  "reasons": ["string"],
  "taskTitle": "string",
  "taskDescription": "string",
  "eligible": true|false,
  "recommendedAction": "string",
  "confidence": 0-1
}`

const BASE_SYSTEM = `Sen MOBILYA OS ERP dijital çalışanısın.
Kurallar:
- Doğrudan veritabanına erişemezsin; yalnızca verilen ERP context ve tool çağrıları kullanılır.
- Business Engine snapshot'ına saygı duy; eligible=false ise görev üretme.
- Yanıtın yalnızca geçerli JSON olmalı.
- Türkçe, profesyonel, kısa ve operasyonel dil kullan.`

/** @type {Record<string, Record<string, PromptTemplate>>} */
const PROMPTS: Record<string, Record<string, PromptTemplate>> = {
  'dw-sales-follow-up': {
    v1: {
      version: 'v1',
      workerId: 'dw-sales-follow-up',
      system: `${BASE_SYSTEM}
Rol: AI Sales Follow-Up — teslim tarihi doğrulama, müşteri arama, satış sonrası takip.
Öncelik: termin gecikmesi, düşük kapora, uzun bekleme.`,
      userTemplate: `Sipariş context:
{{context}}

ERP Memory:
{{memory}}

Kural tabanlı baseline:
{{baseline}}

JSON schema:
{{schema}}`,
      outputSchema: OUTPUT_SCHEMA,
    },
  },
  'dw-collection': {
    v1: {
      version: 'v1',
      workerId: 'dw-collection',
      system: `${BASE_SYSTEM}
Rol: AI Collection Specialist — tahsilat hatırlatma, kapora takibi, vadesi geçen bakiye.`,
      userTemplate: `Sipariş context:
{{context}}

ERP Memory:
{{memory}}

Kural tabanlı baseline:
{{baseline}}

JSON schema:
{{schema}}`,
      outputSchema: OUTPUT_SCHEMA,
    },
  },
  'dw-shipment': {
    v1: {
      version: 'v1',
      workerId: 'dw-shipment',
      system: `${BASE_SYSTEM}
Rol: AI Shipment Specialist — sevk planı, termin, eksik ürün ve sevke hazır kontrolü.`,
      userTemplate: `Sipariş context:
{{context}}

ERP Memory:
{{memory}}

Kural tabanlı baseline:
{{baseline}}

JSON schema:
{{schema}}`,
      outputSchema: OUTPUT_SCHEMA,
    },
  },
  'dw-procurement': {
    v1: {
      version: 'v1',
      workerId: 'dw-procurement',
      system: `${BASE_SYSTEM}
Rol: AI Procurement Specialist — eksik ürün, tedarik siparişi, tedarikçi gecikmesi.`,
      userTemplate: `Sipariş context:
{{context}}

ERP Memory:
{{memory}}

Kural tabanlı baseline:
{{baseline}}

JSON schema:
{{schema}}`,
      outputSchema: OUTPUT_SCHEMA,
    },
  },
}

export function resolvePromptVersion(workerId: string): string {
  const envKey = `AI_PROMPT_${workerId.replace(/-/g, '_').toUpperCase()}`
  return process.env[envKey] ?? process.env.AI_PROMPT_VERSION ?? 'v1'
}

export function getPromptTemplate(workerId: string, version?: string): PromptTemplate {
  const v = version ?? resolvePromptVersion(workerId)
  const workerPrompts = PROMPTS[workerId]
  if (!workerPrompts) throw new Error(`No prompts for worker: ${workerId}`)
  const template = workerPrompts[v]
  if (!template) throw new Error(`Prompt version ${v} not found for ${workerId}`)
  return template
}

export function listPromptVersions(workerId: string): string[] {
  return Object.keys(PROMPTS[workerId] ?? {})
}

export function renderPrompt(
  template: PromptTemplate,
  vars: { context: string; memory: string; baseline: string },
): { system: string; user: string } {
  const user = template.userTemplate
    .replace('{{context}}', vars.context)
    .replace('{{memory}}', vars.memory)
    .replace('{{baseline}}', vars.baseline)
    .replace('{{schema}}', template.outputSchema)

  return { system: template.system, user }
}

export function listAllWorkerPromptVersions(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const workerId of Object.keys(PROMPTS)) {
    out[workerId] = resolvePromptVersion(workerId)
  }
  return out
}
