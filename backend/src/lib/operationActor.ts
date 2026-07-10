import type { AuthUserContext } from './authUser.js'
import { actorWireFromUser } from './authUser.js'

export type OperationActorWire = {
  actorId: string
  actorName: string
  role: string
  action?: string
  at: string
  /** Geriye dönük görüntüleme */
  actor: string
}

export function resolveOperationActor(
  metadata: Record<string, unknown> | undefined,
  authUser: AuthUserContext | undefined,
  defaultAction: string,
): OperationActorWire {
  if (authUser) return actorWireFromUser(authUser, defaultAction)

  const fromMeta = metadata?.operationActor
  if (fromMeta && typeof fromMeta === 'object' && !Array.isArray(fromMeta)) {
    const o = fromMeta as Record<string, unknown>
    const actorId = typeof o.actorId === 'string' ? o.actorId : ''
    const actorName =
      typeof o.actorName === 'string'
        ? o.actorName
        : typeof o.actor === 'string'
          ? o.actor
          : ''
    const role = typeof o.role === 'string' ? o.role : 'UNKNOWN'
    const at = typeof o.at === 'string' && o.at.trim() ? o.at.trim() : new Date().toISOString()
    const action = typeof o.action === 'string' && o.action.trim() ? o.action.trim() : defaultAction
    if (actorName) {
      return {
        actorId: actorId || 'legacy',
        actorName,
        role,
        actor: actorName,
        action,
        at,
      }
    }
  }

  const legacyName =
    typeof metadata?.printedBy === 'string' && metadata.printedBy.trim()
      ? String(metadata.printedBy).trim()
      : 'Sistem'
  const at =
    typeof metadata?.printedAt === 'string' && metadata.printedAt.trim()
      ? String(metadata.printedAt).trim()
      : new Date().toISOString()
  return {
    actorId: 'system',
    actorName: legacyName,
    role: 'SYSTEM',
    actor: legacyName,
    action: defaultAction,
    at,
  }
}

export function mergeActorIntoPayload(
  payload: Record<string, unknown>,
  actor: OperationActorWire,
): Record<string, unknown> {
  return { ...payload, operationActor: actor }
}
