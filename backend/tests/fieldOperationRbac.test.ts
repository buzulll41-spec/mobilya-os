import { describe, expect, it } from 'vitest'
import { PERM, resolveRoutePermission, roleHasPermission } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  FIELD_OP_ACTION,
  canPerformFieldOpAction,
  permissionForFieldOpAction,
} from '../src/services/fieldOperations/fieldOperationPermissionService.js'

const OP_ID = 'FO-abc'

describe('field operation route → permission mapping', () => {
  it('GET list/today/detail → field_ops:read', () => {
    expect(resolveRoutePermission('GET', '/v1/field-operations')).toBe(PERM.FIELD_OPS_READ)
    expect(resolveRoutePermission('GET', '/v1/field-operations/today')).toBe(PERM.FIELD_OPS_READ)
    expect(resolveRoutePermission('GET', `/v1/field-operations/${OP_ID}`)).toBe(PERM.FIELD_OPS_READ)
  })

  it('POST create / PATCH update → field_ops:write', () => {
    expect(resolveRoutePermission('POST', '/v1/field-operations')).toBe(PERM.FIELD_OPS_WRITE)
    expect(resolveRoutePermission('PATCH', `/v1/field-operations/${OP_ID}`)).toBe(PERM.FIELD_OPS_WRITE)
  })

  it('POST transition → field_ops:status', () => {
    expect(resolveRoutePermission('POST', `/v1/field-operations/${OP_ID}/transition`)).toBe(
      PERM.FIELD_OPS_STATUS,
    )
  })

  it('assignment add/remove → field_ops:assign', () => {
    expect(resolveRoutePermission('POST', `/v1/field-operations/${OP_ID}/assignments`)).toBe(
      PERM.FIELD_OPS_ASSIGN,
    )
    expect(resolveRoutePermission('DELETE', `/v1/field-operations/${OP_ID}/assignments/a1`)).toBe(
      PERM.FIELD_OPS_ASSIGN,
    )
  })

  it('DELETE operation → field_ops:delete (assignment DELETE ile karışmaz)', () => {
    expect(resolveRoutePermission('DELETE', `/v1/field-operations/${OP_ID}`)).toBe(
      PERM.FIELD_OPS_DELETE,
    )
  })
})

describe('field operation role matrix', () => {
  it('read: ADMIN/MANAGER/OPERATION/SERVICE/WAREHOUSE izinli', () => {
    for (const role of [
      USER_ROLE.ADMIN,
      USER_ROLE.MANAGER,
      USER_ROLE.OPERATION,
      USER_ROLE.SERVICE,
      USER_ROLE.WAREHOUSE,
    ]) {
      expect(roleHasPermission(role, PERM.FIELD_OPS_READ)).toBe(true)
    }
  })

  it('write: OPERATION/SERVICE izinli; WAREHOUSE değil', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.FIELD_OPS_WRITE)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SERVICE, PERM.FIELD_OPS_WRITE)).toBe(true)
    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.FIELD_OPS_WRITE)).toBe(false)
  })

  it('status: OPERATION/SERVICE/WAREHOUSE izinli', () => {
    for (const role of [USER_ROLE.OPERATION, USER_ROLE.SERVICE, USER_ROLE.WAREHOUSE]) {
      expect(roleHasPermission(role, PERM.FIELD_OPS_STATUS)).toBe(true)
    }
  })

  it('assign: OPERATION izinli; SERVICE/WAREHOUSE değil', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.FIELD_OPS_ASSIGN)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SERVICE, PERM.FIELD_OPS_ASSIGN)).toBe(false)
    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.FIELD_OPS_ASSIGN)).toBe(false)
  })

  it('delete: yalnızca ADMIN/MANAGER', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.FIELD_OPS_DELETE)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.FIELD_OPS_DELETE)).toBe(true)
    for (const role of [USER_ROLE.OPERATION, USER_ROLE.SERVICE, USER_ROLE.WAREHOUSE]) {
      expect(roleHasPermission(role, PERM.FIELD_OPS_DELETE)).toBe(false)
    }
  })
})

describe('permission service action → permission', () => {
  it('aksiyonlar doğru izne eşlenir', () => {
    expect(permissionForFieldOpAction(FIELD_OP_ACTION.READ)).toBe(PERM.FIELD_OPS_READ)
    expect(permissionForFieldOpAction(FIELD_OP_ACTION.CREATE)).toBe(PERM.FIELD_OPS_WRITE)
    expect(permissionForFieldOpAction(FIELD_OP_ACTION.UPDATE)).toBe(PERM.FIELD_OPS_WRITE)
    expect(permissionForFieldOpAction(FIELD_OP_ACTION.TRANSITION)).toBe(PERM.FIELD_OPS_STATUS)
    expect(permissionForFieldOpAction(FIELD_OP_ACTION.ASSIGN)).toBe(PERM.FIELD_OPS_ASSIGN)
    expect(permissionForFieldOpAction(FIELD_OP_ACTION.DELETE)).toBe(PERM.FIELD_OPS_DELETE)
  })

  it('canPerformFieldOpAction rol bazlı çalışır', () => {
    const warehouse = { id: 'u1', fullName: 'W', email: 'w@x', role: USER_ROLE.WAREHOUSE }
    expect(canPerformFieldOpAction(warehouse, FIELD_OP_ACTION.READ)).toBe(true)
    expect(canPerformFieldOpAction(warehouse, FIELD_OP_ACTION.DELETE)).toBe(false)
    const admin = { id: 'u2', fullName: 'A', email: 'a@x', role: USER_ROLE.ADMIN }
    expect(canPerformFieldOpAction(admin, FIELD_OP_ACTION.DELETE)).toBe(true)
  })
})
