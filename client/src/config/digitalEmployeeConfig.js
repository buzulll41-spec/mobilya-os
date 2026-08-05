import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../contracts/v1/aiSalesFollowUp.js'

/**
 * FAZ 44 — First real digital employee (AI Sales end-to-end flow).
 */
export function isDigitalEmployeeEnabled() {
  const flag =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_DIGITAL_EMPLOYEE_ENABLED : undefined
  if (flag === 'false' || flag === false) return false
  return true
}

/** @param {string} workerId */
export function shouldRunDigitalEmployeeForWorker(workerId) {
  return isDigitalEmployeeEnabled() && workerId === AI_SALES_FOLLOW_UP_WORKER_ID
}
