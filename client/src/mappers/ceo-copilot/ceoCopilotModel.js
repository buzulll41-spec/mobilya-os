import { getActiveConversation, listCeoCopilotConversations } from '../../services/ceo-copilot/ceoCopilotStore.js'
import { getActiveLlmProviderLabel } from '../../services/llm/llmProvider.js'

export function buildCeoCopilotSidebarVm() {
  return listCeoCopilotConversations().map((c) => ({
    id: c.id,
    title: c.title,
    preview: c.preview,
    updatedAt: c.updatedAt,
    timeLabel: new Date(c.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  }))
}

export function buildCeoCopilotThreadVm() {
  const conv = getActiveConversation()
  return {
    id: conv.id,
    title: conv.title,
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      roleLabel: m.role === 'ceo' ? 'CEO' : 'Copilot',
      content: m.content,
      timeLabel: new Date(m.occurredAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      toolsUsed: m.toolsUsed ?? [],
      deepLinks: m.deepLinks ?? [],
      providerId: m.providerId,
    })),
  }
}

export function buildCeoCopilotHeaderVm() {
  return {
    providerLabel: getActiveLlmProviderLabel(),
  }
}
