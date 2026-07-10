/** @typedef {{ id: string, label: string, undo: () => void | Promise<void>, createdAt: string }} UndoEntry */

/** @type {UndoEntry[]} */
const stack = []

const MAX_UNDO = 20

/**
 * @param {{ label: string, undo: () => void | Promise<void> }} input
 * @returns {string}
 */
export function pushUndoAction(input) {
  const entry = {
    id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: input.label,
    undo: input.undo,
    createdAt: new Date().toISOString(),
  }
  stack.unshift(entry)
  if (stack.length > MAX_UNDO) stack.pop()
  if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
    globalThis.dispatchEvent(new CustomEvent('mobilya:undo-stack-changed'))
  }
  return entry.id
}

/** @returns {UndoEntry | null} */
export function peekUndoAction() {
  return stack[0] ?? null
}

/** @returns {Promise<boolean>} */
export async function executeUndo() {
  const entry = stack.shift()
  if (!entry) return false
  await entry.undo()
  if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
    globalThis.dispatchEvent(
      new CustomEvent('mobilya:undo-executed', { detail: { id: entry.id, label: entry.label } }),
    )
  }
  return true
}

export function clearUndoStack() {
  stack.length = 0
}

export function getUndoStackSize() {
  return stack.length
}
