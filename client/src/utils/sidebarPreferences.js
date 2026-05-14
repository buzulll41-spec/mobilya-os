import { STORAGE_KEYS } from '../constants/app.js'

export function readSidebarCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1'
  } catch {
    return false
  }
}

/** @param {boolean} collapsed */
export function writeSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}
