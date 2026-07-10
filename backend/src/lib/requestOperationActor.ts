/** Fastify request header → operasyon aktörü (auth yokken). */
export function operationActorFromRequest(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const raw = headers['x-operation-actor'] ?? headers['X-Operation-Actor']
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) return raw[0].trim()
  return undefined
}
