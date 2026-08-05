export type OpsLogLevel = 'info' | 'warn' | 'error'

export type OpsLogPayload = {
  ts: string
  level: OpsLogLevel
  component: 'api' | 'db' | 'worker' | 'notification' | 'system'
  event: string
  message: string
  data?: Record<string, unknown>
}

function writeLog(payload: OpsLogPayload): void {
  const line = JSON.stringify(payload)
  if (payload.level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line)
    return
  }
  if (payload.level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line)
    return
  }
  // eslint-disable-next-line no-console
  console.log(line)
}

export function logOps(
  component: OpsLogPayload['component'],
  event: string,
  message: string,
  data?: Record<string, unknown>,
  level: OpsLogLevel = 'info',
): void {
  writeLog({
    ts: new Date().toISOString(),
    level,
    component,
    event,
    message,
    ...(data ? { data } : {}),
  })
}
