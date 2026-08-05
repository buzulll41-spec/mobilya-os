import React from 'react'

export function SafeArea({ children }: { children: React.ReactNode }) {
  return <div className="ds-safe-area">{children}</div>
}
