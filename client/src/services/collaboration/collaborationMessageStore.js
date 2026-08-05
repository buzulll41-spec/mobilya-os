/** @typedef {import('../../contracts/v1/collaboration.js').WorkerCollaborationMessageDto} WorkerCollaborationMessageDto */

/** @type {WorkerCollaborationMessageDto[]} */
let messages = []

/** @param {WorkerCollaborationMessageDto[]} newMessages */
export function appendCollaborationMessages(newMessages) {
  messages = [...messages, ...newMessages]
}

export function getCollaborationMessagesSnapshot() {
  return messages.slice()
}

/** @param {WorkerCollaborationMessageDto[]} next */
export function setCollaborationMessages(next) {
  messages = next.slice()
}

export function getCollaborationMessageCount() {
  return messages.length
}

export function resetCollaborationMessageStore() {
  messages = []
}

export {}
