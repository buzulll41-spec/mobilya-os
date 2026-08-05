import { mapServiceError } from './mapServiceError.js'

export type NormalizedApiError = {
  statusCode: number
  error: string
  message: string
  details?: unknown
}

export class AppHttpError extends Error {
  statusCode: number
  error: string
  details?: unknown

  constructor(statusCode: number, message: string, error = 'Error', details?: unknown) {
    super(message)
    this.name = 'AppHttpError'
    this.statusCode = statusCode
    this.error = error
    this.details = details
  }

  toJSON(): NormalizedApiError {
    return {
      statusCode: this.statusCode,
      error: this.error,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    }
  }
}

export function normalizeError(err: unknown): NormalizedApiError {
  const mapped = mapServiceError(err)
  if (mapped) {
    return mapped.toJSON()
  }
  if (err instanceof AppHttpError) {
    return err.toJSON()
  }
  if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
    const e = err as { statusCode: number; error?: string; message: string; details?: unknown }
    return {
      statusCode: e.statusCode,
      error: e.error ?? 'Error',
      message: String(e.message),
      details: e.details,
    }
  }
  if (err instanceof Error) {
    return { statusCode: 500, error: 'Internal Server Error', message: err.message }
  }
  return { statusCode: 500, error: 'Internal Server Error', message: 'Unknown error' }
}
