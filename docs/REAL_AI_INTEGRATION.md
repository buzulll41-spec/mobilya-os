# FAZ 40 — Real AI Integration

Provider-bağımsız gerçek LLM entegrasyonu. Business Engine, Worker sistemi, görev kuyruğu ve timeline korunur.

## Mimari

```
Business Engine (deterministik)
        │
        ▼
Rule Baseline (eligibility + priority floor)
        │
        ▼
Backend AI Worker Service
  ├── ContextBuilder (ERP snapshot + order projection)
  ├── ErpMemoryStore (worker+order scoped memory)
  ├── PromptEngine (versioned prompts v1)
  ├── LlmProvider (OpenAI → Claude/Gemini/local swap)
  └── ToolRegistry → ERP servisleri (domain events)
        │
        ▼
Worker Orchestrator (realAiMode) → Timeline + Queue
```

## Backend API

| Endpoint | Açıklama |
|----------|----------|
| `GET /v1/ai/config` | Provider, model, prompt versiyonları |
| `POST /v1/ai/workers/:id/evaluate` | LLM kararı (tool yok) |
| `POST /v1/ai/workers/:id/run` | LLM kararı + tool execution |

## Ortam Değişkenleri (backend `.env`)

```
AI_WORKER_ENABLED=true
AI_LLM_PROVIDER=openai
AI_WORKER_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

## Client

```
VITE_AI_WORKERS_ENABLED=true
VITE_API_BASE_URL=http://localhost:4000
```

## Worker → Tool Map

| Worker | Tool |
|--------|------|
| AI Sales | `log_sales_follow_up` |
| AI Collection | `create_collection_reminder` |
| AI Shipment | `plan_shipment_action` |
| AI Procurement | `create_procurement_task` |

## Provider Değiştirme

1. `LlmProvider` interface implement et
2. `registerLlmProvider()` ile kaydet
3. `AI_LLM_PROVIDER` env güncelle

Prompt versiyonu: `AI_PROMPT_VERSION=v1` veya worker bazlı `AI_PROMPT_DW_SALES_FOLLOW_UP=v1`

## Korunan Katmanlar

- `businessEngine.js` — değiştirilmedi
- `mockDigitalWorkforceStore.js` — queue/history korundu
- `workerOrchestrator.js` — `realAiMode` eklendi
- Domain event types + timeline — korundu

## Test

- `backend/tests/realAiIntegration.test.ts` (5 test, mock LLM)
- `client/tests/foundation/realAiIntegration.test.js` (3 test)
