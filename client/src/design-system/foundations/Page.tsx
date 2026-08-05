import React from 'react'
import { SafeArea } from './SafeArea'
import { Layout } from './Layout'
import { Container } from './Container'

export function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SafeArea>
      <Layout>
        <Container>
          <header className="ds-page-header-shell">
            <h1 className="ds-text-title">{title}</h1>
          </header>
          {children}
        </Container>
      </Layout>
    </SafeArea>
  )
}
