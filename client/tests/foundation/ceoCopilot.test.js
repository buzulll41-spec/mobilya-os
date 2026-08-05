import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { resetDigitalWorkforceStore } from '../../src/services/mockDigitalWorkforceStore.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'
import { resetCompanyBrainStore } from '../../src/services/company-brain/companyBrainStore.js'
import { resetGenesisStore } from '../../src/services/genesis/genesisStore.js'
import { resetGlobalMemoryStore } from '../../src/services/genesis/globalMemoryStore.js'
import { CEO_COPILOT_INTENT } from '../../src/contracts/v1/ceoCopilot.js'
import { detectCeoCopilotIntent } from '../../src/engine/ceo-copilot/CeoCopilotIntentEngine.js'
import { buildCeoCopilotContext } from '../../src/engine/ceo-copilot/CeoCopilotContextEngine.js'
import { buildStructuredCopilotReply } from '../../src/engine/ceo-copilot/CeoCopilotResponseEngine.js'
import { buildDeepLinksForIntent } from '../../src/engine/ceo-copilot/deepLinkBuilder.js'
import { executeCeoCopilotTool } from '../../src/engine/ceo-copilot/CeoCopilotToolEngine.js'
import { processCeoCopilotMessage } from '../../src/services/ceo-copilot/CeoCopilotEngine.js'
import { fetchGraphQuery, GRAPH_QUERY } from '../../src/services/graphClient.js'
import { resetKnowledgeGraphCacheForTests } from '../../src/services/graph/KnowledgeGraphService.js'
import { resetPredictionCacheForTests } from '../../src/services/prediction/PredictionService.js'
import { resetLearningStoreForTests } from '../../src/services/learning/LearningEngineService.js'
import { resetDecisionQualityStoreForTests } from '../../src/services/decision/DecisionQualityService.js'
import { resetSelfOptimizationStoreForTests } from '../../src/services/optimization/SelfOptimizationService.js'
import { resetCollaborationStoreForTests } from '../../src/services/collaboration/CollaborationService.js'
import { resetBoardMeetingStoreForTests } from '../../src/services/board/BoardMeetingService.js'
import {
  getActiveConversation,
  getConversationMemory,
  resetCeoCopilotStoreForTests,
  startNewConversation,
} from '../../src/services/ceo-copilot/ceoCopilotStore.js'
import { completeLlmChat, getActiveLlmProviderLabel } from '../../src/services/llm/llmProvider.js'
import { getLlmProviderId } from '../../src/config/llmConfig.js'

describe('CEO Copilot V1 (FAZ 102)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    vi.unstubAllEnvs()
    resetCeoCopilotStoreForTests()
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    resetCompanyManagerStore()
    resetCompanyBrainStore()
    resetGenesisStore()
    resetGlobalMemoryStore()
    resetKnowledgeGraphCacheForTests()
    resetPredictionCacheForTests()
    resetLearningStoreForTests()
    resetDecisionQualityStoreForTests()
    resetSelfOptimizationStoreForTests()
    resetCollaborationStoreForTests()
    resetBoardMeetingStoreForTests()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    startNewConversation('Test')
  })

  describe('Prompt / Intent', () => {
    it('CEO sorularını doğru intent ile eşleştirir', () => {
      expect(detectCeoCopilotIntent('Bugün sorun ne?')).toBe(CEO_COPILOT_INTENT.TODAY_ISSUES)
      expect(detectCeoCopilotIntent('Bugün ne yapmalıyım?')).toBe(CEO_COPILOT_INTENT.TODAY_PRIORITIES)
      expect(detectCeoCopilotIntent('Neden tahsilat düştü?')).toBe(CEO_COPILOT_INTENT.COLLECTION_WHY)
      expect(detectCeoCopilotIntent('Bu ay ciro neden düştü?')).toBe(CEO_COPILOT_INTENT.REVENUE_WHY)
      expect(detectCeoCopilotIntent('Riskler neler?')).toBe(CEO_COPILOT_INTENT.RISKS)
      expect(detectCeoCopilotIntent('Collection ne durumda?')).toBe(CEO_COPILOT_INTENT.WORKER_COLLECTION)
      expect(detectCeoCopilotIntent('Şirket sağlığı nasıl?')).toBe(CEO_COPILOT_INTENT.COMPANY_HEALTH)
      expect(detectCeoCopilotIntent('Detay göster')).toBe(CEO_COPILOT_INTENT.SHOW_DETAIL)
      expect(
        detectCeoCopilotIntent('Tahsilatı geciken ama sevki hazır siparişler'),
      ).toBe(CEO_COPILOT_INTENT.GRAPH_OVERDUE_READY)
      expect(detectCeoCopilotIntent("Nazlı'nın riskli müşterileri")).toBe(
        CEO_COPILOT_INTENT.GRAPH_EMPLOYEE_RISKY,
      )
      expect(detectCeoCopilotIntent('Bugün hangi siparişler riskli?')).toBe(
        CEO_COPILOT_INTENT.PREDICTION_RISKY_ORDERS,
      )
      expect(detectCeoCopilotIntent('Yarın gecikme yaşayacağımız siparişler?')).toBe(
        CEO_COPILOT_INTENT.PREDICTION_TOMORROW_DELAY,
      )
      expect(detectCeoCopilotIntent('En riskli müşteriler?')).toBe(
        CEO_COPILOT_INTENT.PREDICTION_RISKY_CUSTOMERS,
      )
      expect(detectCeoCopilotIntent('Bu hafta tahsilat riski?')).toBe(
        CEO_COPILOT_INTENT.PREDICTION_WEEK_COLLECTION,
      )
      expect(detectCeoCopilotIntent('AI son zamanlarda ne kadar doğru tahmin yaptı?')).toBe(
        CEO_COPILOT_INTENT.LEARNING_ACCURACY,
      )
      expect(detectCeoCopilotIntent('En başarılı prediction hangisi?')).toBe(
        CEO_COPILOT_INTENT.LEARNING_BEST_PREDICTION,
      )
      expect(detectCeoCopilotIntent('En çok hata yaptığı konu nedir?')).toBe(
        CEO_COPILOT_INTENT.LEARNING_WORST_TOPIC,
      )
      expect(detectCeoCopilotIntent('Prediction güven puanı kaç?')).toBe(
        CEO_COPILOT_INTENT.LEARNING_CONFIDENCE,
      )
      expect(detectCeoCopilotIntent('En başarılı AI Worker hangisi?')).toBe(
        CEO_COPILOT_INTENT.DECISION_BEST_WORKER,
      )
      expect(detectCeoCopilotIntent('En düşük kalite hangi kararlar?')).toBe(
        CEO_COPILOT_INTENT.DECISION_LOW_QUALITY,
      )
      expect(detectCeoCopilotIntent('Son 30 günde AI performansı?')).toBe(
        CEO_COPILOT_INTENT.DECISION_30_DAY_PERFORMANCE,
      )
      expect(detectCeoCopilotIntent('Riski en çok azaltan kararlar?')).toBe(
        CEO_COPILOT_INTENT.DECISION_RISK_REDUCTION,
      )
      expect(detectCeoCopilotIntent('AI son bir ayda nasıl gelişti?')).toBe(
        CEO_COPILOT_INTENT.OPTIMIZATION_MONTHLY_GROWTH,
      )
      expect(detectCeoCopilotIntent('En çok gelişen worker?')).toBe(
        CEO_COPILOT_INTENT.OPTIMIZATION_BEST_WORKER,
      )
      expect(detectCeoCopilotIntent('En çok strateji değiştiren worker?')).toBe(
        CEO_COPILOT_INTENT.OPTIMIZATION_MOST_CHANGES,
      )
      expect(detectCeoCopilotIntent('Şu an hangi strateji kullanılıyor?')).toBe(
        CEO_COPILOT_INTENT.OPTIMIZATION_CURRENT_STRATEGY,
      )
      expect(detectCeoCopilotIntent('Bugün AI çalışanları birbirleriyle ne konuştu?')).toBe(
        CEO_COPILOT_INTENT.COLLABORATION_TODAY_FEED,
      )
      expect(detectCeoCopilotIntent('En fazla yardım isteyen worker hangisi?')).toBe(
        CEO_COPILOT_INTENT.COLLABORATION_MOST_HELP,
      )
      expect(detectCeoCopilotIntent('En yoğun iş birliği hangi ekipte?')).toBe(
        CEO_COPILOT_INTENT.COLLABORATION_BUSIEST_TEAM,
      )
      expect(detectCeoCopilotIntent('Yönetim kurulunu topla')).toBe(CEO_COPILOT_INTENT.BOARD_CONVENE)
      expect(detectCeoCopilotIntent('Bugünkü şirket toplantısını yap')).toBe(
        CEO_COPILOT_INTENT.BOARD_TODAY_MEETING,
      )
      expect(detectCeoCopilotIntent('En önemli üç karar nedir?')).toBe(CEO_COPILOT_INTENT.BOARD_TOP_DECISIONS)
      expect(detectCeoCopilotIntent('Yarın neye odaklanmalıyız?')).toBe(CEO_COPILOT_INTENT.BOARD_TOMORROW_FOCUS)
      expect(detectCeoCopilotIntent('Neden satış düştü?')).toBe(CEO_COPILOT_INTENT.BOARD_STRATEGIC_QUESTION)
    })
  })

  describe('Structured responses', () => {
    it('örnek CEO yanıtlarını üretir', () => {
      const ctx = buildCeoCopilotContext({ orders, dtos, todayIso: DEMO_TODAY })
      const issues = buildStructuredCopilotReply(CEO_COPILOT_INTENT.TODAY_ISSUES, ctx)
      expect(issues.toLowerCase()).toMatch(/kritik|tahsilat/)

      const priorities = buildStructuredCopilotReply(CEO_COPILOT_INTENT.TODAY_PRIORITIES, ctx)
      expect(priorities).toMatch(/Öncelik/)

      const collection = buildStructuredCopilotReply(CEO_COPILOT_INTENT.WORKER_COLLECTION, ctx)
      expect(collection).toMatch(/Worker raporu/)

      const health = buildStructuredCopilotReply(CEO_COPILOT_INTENT.COMPANY_HEALTH, ctx)
      expect(health).toMatch(/Score/)
    })
  })

  describe('Tool', () => {
    it('brain scan aracını çalıştırır', () => {
      vi.stubEnv('VITE_COMPANY_BRAIN_ENABLED', 'true')
      const result = executeCeoCopilotTool('run_brain_scan', {
        orders,
        dtos,
        todayIso: DEMO_TODAY,
        apply: true,
      })
      expect(result.ok).toBe(true)
    })
  })

  describe('Deep Link', () => {
    it('intent için sayfa deep link üretir', () => {
      const ctx = buildCeoCopilotContext({ orders, dtos, todayIso: DEMO_TODAY })
      const links = buildDeepLinksForIntent(CEO_COPILOT_INTENT.WORKER_COLLECTION, ctx)
      expect(links[0]?.pageId).toBe('digital-workforce')
      expect(links[0]?.hash).toContain('worker')
    })
  })

  describe('History / Memory', () => {
    it('konuşma geçmişini hatırlar', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY }
      await processCeoCopilotMessage('Bugün sorun ne?', ctx)
      await processCeoCopilotMessage('Detay göster', ctx)
      const conv = getActiveConversation()
      expect(conv.messages.length).toBeGreaterThanOrEqual(4)
      const memory = getConversationMemory()
      expect(memory.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('LLM Provider', () => {
    it('mock provider varsayılan', async () => {
      expect(getLlmProviderId()).toBe('mock')
      expect(getActiveLlmProviderLabel()).toContain('Mock')
      const result = await completeLlmChat([{ role: 'user', content: 'test' }], { fallback: 'mock yanıt' })
      expect(result.providerId).toBe('mock')
      expect(result.content).toBeTruthy()
    })

    it('openai provider env ile seçilir', () => {
      vi.stubEnv('VITE_LLM_PROVIDER', 'openai')
      expect(getLlmProviderId()).toBe('openai')
    })
  })

  describe('Knowledge Graph integration', () => {
    it('graph query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const graph = await fetchGraphQuery(GRAPH_QUERY.OVERDUE_PAYMENT_READY_SHIPMENT, {}, ctx)
      expect(graph.meta).toBeDefined()

      const result = await processCeoCopilotMessage('Tahsilatı geciken ama sevki hazır siparişler', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Knowledge Graph/i)
      expect(result.message?.toolsUsed).toContain('knowledge_graph_query')
    })
  })

  describe('Prediction Engine integration', () => {
    it('prediction query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const result = await processCeoCopilotMessage('Bugün hangi siparişler riskli?', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Prediction Engine/i)
      expect(result.message?.toolsUsed).toContain('prediction_engine')
    })
  })

  describe('Learning Engine integration', () => {
    it('learning query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const result = await processCeoCopilotMessage('AI son zamanlarda ne kadar doğru tahmin yaptı?', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Learning Engine/i)
      expect(result.message?.toolsUsed).toContain('learning_engine')
    })
  })

  describe('Decision Quality integration', () => {
    it('decision quality query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const result = await processCeoCopilotMessage('En başarılı AI Worker hangisi?', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Decision Quality/i)
      expect(result.message?.toolsUsed).toContain('decision_quality_engine')
    })
  })

  describe('Self Optimization integration', () => {
    it('optimization query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const result = await processCeoCopilotMessage('AI son bir ayda nasıl gelişti?', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Self Optimization/i)
      expect(result.message?.toolsUsed).toContain('self_optimization_engine')
    })
  })

  describe('Collaboration integration', () => {
    it('collaboration query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const result = await processCeoCopilotMessage('Bugün AI çalışanları birbirleriyle ne konuştu?', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Multi-Agent Collaboration/i)
      expect(result.message?.toolsUsed).toContain('collaboration_engine')
    })
  })

  describe('Strategic Board integration', () => {
    it('board query ile CEO copilot yanıtı', async () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY, collectionRows: [] }
      const result = await processCeoCopilotMessage('Yönetim kurulunu topla', ctx)
      expect(result.ok).toBe(true)
      expect(result.message?.content).toMatch(/Strategic AI Board/i)
      expect(result.message?.toolsUsed).toContain('board_meeting_engine')
    })
  })

  describe('End-to-end copilot', () => {
    it('mesaj gönderimi CEO + assistant üretir', async () => {
      vi.stubEnv('VITE_COMPANY_BRAIN_ENABLED', 'true')
      vi.stubEnv('VITE_GENESIS_ENABLED', 'true')
      const result = await processCeoCopilotMessage('Bugün ne yapmalıyım?', {
        orders,
        dtos,
        todayIso: DEMO_TODAY,
      })
      expect(result.ok).toBe(true)
      expect(result.message?.content.length).toBeGreaterThan(5)
      expect(result.intent).toBe(CEO_COPILOT_INTENT.TODAY_PRIORITIES)
    })
  })
})
