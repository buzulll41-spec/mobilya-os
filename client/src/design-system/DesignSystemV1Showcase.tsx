import React from 'react'
import { Page } from './foundations/Page'
import {
  Button,
  Card,
  MetricCard,
  SummaryCard,
  ListRow,
  TimelineRow,
  SearchBar,
  SearchHeader,
  PageHeader,
  SectionHeader,
  QuickAction,
  BottomNavigation,
  FAB,
  StatusBadge,
  EmptyState,
  Skeleton,
  Dialog,
  BottomSheet,
  Toast,
  Avatar,
  KPIChip,
  NotificationBadge,
  ActionCard,
} from './components'
import './styles/tokens.css'
import './styles/components.css'

const states = ['default', 'loading', 'empty', 'disabled', 'error', 'success'] as const

const registry = [
  { name: 'Button', Component: Button },
  { name: 'Card', Component: Card },
  { name: 'MetricCard', Component: MetricCard },
  { name: 'SummaryCard', Component: SummaryCard },
  { name: 'ListRow', Component: ListRow },
  { name: 'TimelineRow', Component: TimelineRow },
  { name: 'SearchBar', Component: SearchBar },
  { name: 'SearchHeader', Component: SearchHeader },
  { name: 'PageHeader', Component: PageHeader },
  { name: 'SectionHeader', Component: SectionHeader },
  { name: 'QuickAction', Component: QuickAction },
  { name: 'BottomNavigation', Component: BottomNavigation },
  { name: 'FAB', Component: FAB },
  { name: 'StatusBadge', Component: StatusBadge },
  { name: 'EmptyState', Component: EmptyState },
  { name: 'Skeleton', Component: Skeleton },
  { name: 'Dialog', Component: Dialog },
  { name: 'BottomSheet', Component: BottomSheet },
  { name: 'Toast', Component: Toast },
  { name: 'Avatar', Component: Avatar },
  { name: 'KPIChip', Component: KPIChip },
  { name: 'NotificationBadge', Component: NotificationBadge },
  { name: 'ActionCard', Component: ActionCard },
]

function ComponentStory({ name, Component }: { name: string; Component: any }) {
  return (
    <section className="ds-section" aria-label={name}>
      <h2 className="ds-text-subtitle">{name}</h2>
      <div className="ds-variation-stack">
        {states.map((state) => (
          <Component
            key={`${name}-${state}`}
            state={state}
            title={`${name} ${state}`}
            subtitle={`${name} variant: ${state}`}
          />
        ))}
      </div>
    </section>
  )
}

export function DesignSystemV1Showcase() {
  return (
    <Page title="Design System V1 Demo">
      <p className="ds-text-body">All mobile screens must compose these components only.</p>
      <div className="ds-component-grid">
        {registry.map((entry) => (
          <ComponentStory key={entry.name} name={entry.name} Component={entry.Component} />
        ))}
      </div>
    </Page>
  )
}
