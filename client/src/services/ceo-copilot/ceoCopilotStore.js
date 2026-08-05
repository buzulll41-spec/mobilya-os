import { getCeoCopilotMaxHistory } from '../../config/ceoCopilotConfig.js'
import { CEO_COPILOT_ROLE } from '../../contracts/v1/ceoCopilot.js'

/**
 * @typedef {Object} CeoCopilotMessage
 * @property {string} id
 * @property {'ceo' | 'assistant' | 'system'} role
 * @property {string} content
 * @property {string} occurredAt
 * @property {string} [intent]
 * @property {string[]} [toolsUsed]
 * @property {{ pageId: string, label: string, hash?: string }[]} [deepLinks]
 * @property {string} [providerId]
 */

/**
 * @typedef {Object} CeoCopilotConversation
 * @property {string} id
 * @property {string} title
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {CeoCopilotMessage[]} messages
 */

/** @type {CeoCopilotConversation[]} */
let conversations = []

/** @type {string | null} */
let activeConversationId = null

/** @type {Set<() => void>} */
const listeners = new Set()

function bump() {
  for (const l of listeners) l()
}

/** @param {() => void} listener */
export function subscribeCeoCopilotStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function createConversation(title = 'Yeni konuşma') {
  const now = new Date().toISOString()
  const conv = {
    id: `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  conversations.unshift(conv)
  activeConversationId = conv.id
  bump()
  return conv
}

export function listCeoCopilotConversations() {
  return conversations.map((c) => ({
    ...c,
    messages: [...c.messages],
    preview: c.messages.find((m) => m.role === CEO_COPILOT_ROLE.CEO)?.content?.slice(0, 60) ?? '',
  }))
}

export function getActiveConversationId() {
  return activeConversationId
}

/** @param {string} id */
export function setActiveConversationId(id) {
  if (conversations.some((c) => c.id === id)) {
    activeConversationId = id
    bump()
  }
}

export function getActiveConversation() {
  if (!activeConversationId) return createConversation()
  const conv = conversations.find((c) => c.id === activeConversationId)
  if (!conv) return createConversation()
  return { ...conv, messages: [...conv.messages] }
}

/** @param {string} [title] */
export function startNewConversation(title) {
  return createConversation(title)
}

/**
 * @param {Omit<CeoCopilotMessage, 'id' | 'occurredAt'> & { id?: string, occurredAt?: string }} msg
 */
export function appendCeoCopilotMessage(msg) {
  let conv = conversations.find((c) => c.id === activeConversationId)
  if (!conv) conv = createConversation()

  const entry = {
    id: msg.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: msg.role,
    content: msg.content,
    occurredAt: msg.occurredAt ?? new Date().toISOString(),
    intent: msg.intent,
    toolsUsed: msg.toolsUsed,
    deepLinks: msg.deepLinks,
    providerId: msg.providerId,
  }

  conv.messages.push(entry)
  conv.updatedAt = entry.occurredAt

  if (conv.messages.filter((m) => m.role === CEO_COPILOT_ROLE.CEO).length === 1 && msg.role === CEO_COPILOT_ROLE.CEO) {
    conv.title = msg.content.slice(0, 42) + (msg.content.length > 42 ? '…' : '')
  }

  const max = getCeoCopilotMaxHistory()
  if (conv.messages.length > max) {
    conv.messages = conv.messages.slice(-max)
  }

  bump()
  return entry
}

/** @param {number} [limit] */
export function getConversationMemory(limit = 12) {
  const conv = getActiveConversation()
  return conv.messages.slice(-limit).map((m) => ({
    role: m.role === CEO_COPILOT_ROLE.CEO ? 'user' : 'assistant',
    content: m.content,
  }))
}

export function resetCeoCopilotStoreForTests() {
  conversations = []
  activeConversationId = null
  listeners.clear()
}
