import { useCallback, useEffect, useState } from 'react'
import {
  getAiEmployeeActivityVersion,
  subscribeAiEmployeeActivity,
} from '../services/ai-employee/aiEmployeeActivityStore.js'

/**
 * Subscribe to digital employee live activity updates.
 */
export function useAiEmployeeActivity() {
  const [version, setVersion] = useState(getAiEmployeeActivityVersion())

  const bump = useCallback(() => {
    setVersion(getAiEmployeeActivityVersion())
  }, [])

  useEffect(() => subscribeAiEmployeeActivity(bump), [bump])

  return { version }
}

export {}
