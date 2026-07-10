# FAZ 43 — Real LLM Provider Layer

## Architecture

```
AiWorkerService.runAiWorkerTask()
  └── LLMService.executeWorker()
        ├── PromptBuilder.buildWorkerPrompt()  → Context + Memory + BE + Tools
        ├── ProviderFactory.resolveActiveProvider()
        └── provider.generate()  → retry, timeout, cost tracking
```

## Providers

| Provider | ID | Env |
|----------|-----|-----|
| MockProvider | `mock` | default — offline/tests |
| OpenAIProvider | `openai` | `OPENAI_API_KEY` |
| GeminiProvider | `gemini` | `GEMINI_API_KEY` |

Switch provider without ERP code changes:

```env
AI_LLM_PROVIDER=mock|openai|gemini
```

## Central config (`backend/src/config/aiConfig.ts`)

| Variable | Default |
|----------|---------|
| `AI_WORKER_ENABLED` | false |
| `AI_LLM_PROVIDER` | mock |
| `AI_WORKER_MODEL` | gpt-4o-mini |
| `AI_LLM_TEMPERATURE` | 0.2 |
| `AI_LLM_MAX_TOKENS` | 1200 |
| `AI_LLM_TIMEOUT_MS` | 30000 |
| `AI_LLM_MAX_RETRIES` | 2 |
| `AI_LLM_STREAM_ENABLED` | true |
| `AI_LLM_COST_TRACKING` | true |

## Provider Interface

```typescript
interface LlmProvider {
  readonly id: LlmProviderId
  generate(request, options?): Promise<LlmGenerateResponse>
  stream?(request, options?): AsyncIterable<LlmStreamChunk>
}
```

## Files

- `backend/src/services/ai/LLMService.ts`
- `backend/src/services/ai/llm/ProviderFactory.ts`
- `backend/src/services/ai/llm/providers/MockProvider.ts`
- `backend/src/services/ai/llm/providers/OpenAIProvider.ts`
- `backend/src/services/ai/llm/providers/GeminiProvider.ts`
- `backend/src/services/ai/prompt/PromptBuilder.ts`
- `backend/src/config/aiConfig.ts`
