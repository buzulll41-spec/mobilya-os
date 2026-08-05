import { describe, expect, it } from 'vitest'
import { PERM, resolveRoutePermission, roleHasPermission } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'

describe('supply-order confirm RBAC', () => {
  const path = '/v1/orders/S-123/supply-order/confirm'

  it('route maps to supply_order:confirm permission', () => {
    expect(resolveRoutePermission('POST', path)).toBe(PERM.SUPPLY_ORDER_CONFIRM)
  })

  it('allowed roles can confirm supply', () => {
    for (const role of [USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.SALES, USER_ROLE.OPERATION]) {
      expect(roleHasPermission(role, PERM.SUPPLY_ORDER_CONFIRM)).toBe(true)
    }
  })

  it('SERVICE and FINANCE cannot confirm supply', () => {
    expect(roleHasPermission(USER_ROLE.SERVICE, PERM.SUPPLY_ORDER_CONFIRM)).toBe(false)
    expect(roleHasPermission(USER_ROLE.FINANCE, PERM.SUPPLY_ORDER_CONFIRM)).toBe(false)
  })
})

describe('incoming goods pending list RBAC', () => {
  const path = '/v1/incoming-goods/pending-order-lines'

  it('route maps to incoming:read permission', () => {
    expect(resolveRoutePermission('GET', path)).toBe(PERM.INCOMING_READ)
  })

  it('store roles that write incoming goods can also list pending lines', () => {
    for (const role of [USER_ROLE.SALES, USER_ROLE.OPERATION, USER_ROLE.WAREHOUSE]) {
      expect(roleHasPermission(role, PERM.INCOMING_READ)).toBe(true)
      expect(roleHasPermission(role, PERM.INCOMING_WRITE)).toBe(true)
    }
  })
})

describe('order create RBAC', () => {
  it('POST /v1/orders maps to orders:create', () => {
    expect(resolveRoutePermission('POST', '/v1/orders')).toBe(PERM.ORDERS_CREATE)
  })

  it('Sales and Operation can create orders', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.ORDERS_CREATE)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.ORDERS_CREATE)).toBe(true)
  })

  it('Warehouse and Service cannot create orders', () => {
    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.ORDERS_CREATE)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SERVICE, PERM.ORDERS_CREATE)).toBe(false)
  })
})
