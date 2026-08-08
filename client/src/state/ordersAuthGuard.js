/**
 * Orders refresh should wait until auth bootstrap has resolved in API mode.
 * @param {{ apiMode: boolean, authLoading: boolean, user?: { id?: string } | null }} input
 * @returns {boolean}
 */
export function shouldRefreshOrdersForAuth({ apiMode, authLoading, user }) {
  return Boolean(apiMode && !authLoading && user?.id)
}
