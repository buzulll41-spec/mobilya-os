/**
 * Enterprise 2.2 S2 — Permission Service.
 *
 * Saha operasyonu aksiyonlarını mevcut RBAC izinlerine (PERM) eşler ve rol bazlı
 * yetki kontrolü sağlar. Yeni auth sistemi YOK; mevcut RBAC matrisini kullanır.
 * HTTP katmanındaki global RBAC hook'una ek olarak servis seviyesinde de
 * savunma (defense-in-depth) ve test edilebilir yetki mantığı sunar.
 */

import { AppHttpError } from '../../errors/apiError.js'
import type { AuthUserContext } from '../../lib/authUser.js'
import { PERM, roleHasPermission, type Permission } from '../../middleware/rbac.js'

export const FIELD_OP_ACTION = {
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  TRANSITION: 'TRANSITION',
  ASSIGN: 'ASSIGN',
  DELETE: 'DELETE',
} as const

export type FieldOpAction = (typeof FIELD_OP_ACTION)[keyof typeof FIELD_OP_ACTION]

const ACTION_PERMISSION: Record<FieldOpAction, Permission> = {
  READ: PERM.FIELD_OPS_READ,
  CREATE: PERM.FIELD_OPS_WRITE,
  UPDATE: PERM.FIELD_OPS_WRITE,
  TRANSITION: PERM.FIELD_OPS_STATUS,
  ASSIGN: PERM.FIELD_OPS_ASSIGN,
  DELETE: PERM.FIELD_OPS_DELETE,
}

/** Bir aksiyonun gerektirdiği RBAC iznini döndürür. */
export function permissionForFieldOpAction(action: FieldOpAction): Permission {
  return ACTION_PERMISSION[action]
}

/** Kullanıcının aksiyonu yapıp yapamayacağını döndürür (saf kontrol). */
export function canPerformFieldOpAction(user: AuthUserContext, action: FieldOpAction): boolean {
  return roleHasPermission(user.role, ACTION_PERMISSION[action])
}

/** Yetki yoksa 403 fırlatır. */
export function assertFieldOpPermission(user: AuthUserContext, action: FieldOpAction): void {
  if (!canPerformFieldOpAction(user, action)) {
    throw new AppHttpError(403, 'Bu işlem için yetkiniz yok', 'Forbidden', {
      role: user.role,
      permission: ACTION_PERMISSION[action],
    })
  }
}
