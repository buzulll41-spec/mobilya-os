import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppMode,
  isDemoMode,
  isProductionMode,
  shouldShowDemoBanner,
} from '../../src/config/appMode.js'
import { getDataSourceDisplay, isUsingMockData } from '../../src/config/dataSource.js'
import { DEMO_TODAY, getOperationalToday } from '../../src/data/constants.js'
import {
  STORE_ACTION,
  canPerformStoreAction,
  canPerformStoreActionOnPage,
} from '../../src/constants/roleActions.js'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import { buildLiveSystemHealthView } from '../../src/mappers/pilot/systemHealthModel.js'
import { isRetryableApiError, withApiRetry } from '../../src/lib/apiRetry.js'
import { ApiClientError } from '../../src/lib/apiClient.js'
import {
  clearOperationAuditForTests,
  listOperationAudit,
  recordOperationAudit,
} from '../../src/lib/operationAuditLog.js'
import { clearUndoStack, executeUndo, peekUndoAction, pushUndoAction } from '../../src/lib/undoStack.js'

describe('live store pilot (FAZ 46)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    clearOperationAuditForTests()
    clearUndoStack()
  })

  it('defaults to demo mode when VITE_APP_MODE unset', () => {
    expect(getAppMode()).toBe('demo')
    expect(isDemoMode()).toBe(true)
    expect(shouldShowDemoBanner()).toBe(true)
  })

  it('production mode hides demo banner and uses real today', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    expect(isProductionMode()).toBe(true)
    expect(shouldShowDemoBanner()).toBe(false)
    expect(getOperationalToday()).not.toBe(DEMO_TODAY)
    expect(getOperationalToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('production + no API marks mock data source as critical in health view', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(isUsingMockData()).toBe(true)
    const view = buildLiveSystemHealthView({ apiOk: null, dbOk: null })
    expect(view.items.find((i) => i.id === 'api')?.tone).toBe('critical')
    expect(getDataSourceDisplay().showIndicator).toBe(false)
  })

  it('role actions gate store operations by role', () => {
    expect(canPerformStoreAction(USER_ROLE.SALES, STORE_ACTION.CREATE_ORDER)).toBe(true)
    expect(canPerformStoreAction(USER_ROLE.SERVICE, STORE_ACTION.CREATE_ORDER)).toBe(false)
    expect(canPerformStoreAction(USER_ROLE.FINANCE, STORE_ACTION.PLAN_SHIPMENT)).toBe(false)
    expect(canPerformStoreActionOnPage(USER_ROLE.WAREHOUSE, STORE_ACTION.PLAN_SHIPMENT, 'shipment-ops')).toBe(
      true,
    )
    expect(canPerformStoreAction(USER_ROLE.ADMIN, STORE_ACTION.VIEW_SYSTEM_HEALTH)).toBe(true)
    expect(canPerformStoreAction(USER_ROLE.SALES, STORE_ACTION.VIEW_SYSTEM_HEALTH)).toBe(false)
  })

  it('api retry retries network and timeout errors', async () => {
    let attempts = 0
    const result = await withApiRetry(
      async () => {
        attempts += 1
        if (attempts < 3) {
          throw new ApiClientError({ kind: 'timeout', message: 'timeout' })
        }
        return 'ok'
      },
      { maxAttempts: 3, delayMs: 1 },
    )
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
    expect(isRetryableApiError(new ApiClientError({ kind: 'http', message: 'x', status: 500 }))).toBe(false)
  })

  it('audit log and undo stack record operations', async () => {
    recordOperationAudit({ action: 'payment.post', actorRole: 'FINANCE', detail: 'Kapora' })
    expect(listOperationAudit(5)[0]?.action).toBe('payment.post')

    pushUndoAction({ label: 'Test geri al', undo: () => {} })
    expect(peekUndoAction()?.label).toBe('Test geri al')
    await expect(executeUndo()).resolves.toBe(true)
  })
})
