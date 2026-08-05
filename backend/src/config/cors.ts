/** CORS preflight — PATCH/PUT/DELETE mutasyonları için zorunlu (varsayılan yalnızca GET,HEAD,POST). */
export const CORS_ALLOWED_METHODS = [
  'GET',
  'HEAD',
  'PUT',
  'PATCH',
  'POST',
  'DELETE',
  'OPTIONS',
] as const

export const CORS_ALLOWED_HEADERS = ['Content-Type', 'Accept', 'Authorization'] as const
