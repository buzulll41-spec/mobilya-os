import { listErrorCenterEntries, listTodayErrors } from '../../lib/errorCenterStore.js'

/**
 * @param {string} todayIso
 * @param {number} [limit]
 */
export function buildErrorCenterView(todayIso, limit = 100) {
  const all = listErrorCenterEntries(limit)
  const today = listTodayErrors(todayIso)
  const open = all.filter((e) => !e.resolved)

  return {
    todayCount: today.length,
    openCount: open.length,
    totalShown: all.length,
    todayErrors: today.map(mapErrorRow),
    recentErrors: all.map(mapErrorRow),
  }
}

/**
 * @param {import('../../lib/errorCenterStore.js').ErrorCenterEntry} entry
 */
function mapErrorRow(entry) {
  return {
    id: entry.id,
    category: entry.category,
    categoryLabel: categoryLabel(entry.category),
    message: entry.message,
    stack: entry.stack,
    userLabel: entry.userName ? `${entry.userName}${entry.userRole ? ` (${entry.userRole})` : ''}` : '—',
    pageId: entry.pageId ?? '—',
    timeLabel: new Date(entry.occurredAt).toLocaleTimeString('tr-TR'),
    occurredAt: entry.occurredAt,
    resolved: entry.resolved,
    resolvedAt: entry.resolvedAt,
  }
}

/** @param {import('../../lib/errorCenterStore.js').ErrorCategory} category */
function categoryLabel(category) {
  const map = {
    runtime: 'Runtime',
    api: 'API',
    boundary: 'Boundary',
    network: 'Ağ',
    validation: 'Doğrulama',
  }
  return map[category] ?? category
}
