# Sprint 7 - Mobile Design System V3

## Scope
- Harden the existing mobile design system without adding new business modules.
- Standardize shared V3 components and state variants.
- Keep operation-first contracts from Sprint 6.x intact.

## V3 Component Contract
- OperationCard
- PriorityBadge
- MetricBadge
- SectionHeader
- SearchField
- SegmentFilter
- ActionRow
- Avatar
- NotificationButton
- EmptyState
- LoadingSkeleton
- ListItem
- ChevronRow
- FloatingActionButton
- BottomSheet
- ConfirmDialog
- Toast

## Variant and State Contract
- Theme: `light`, `dark`
- Interaction states: `selected`, `pressed`, `hovered`
- Runtime states: `loading`, `disabled`
- Contract mechanism: `data-theme`, `data-selected`, `data-loading`, `data-pressed`, `data-hovered`

## Token Contract
- Spacing: `--evm-v4-space-*`
- Radius: `--evm-v4-radius-*`
- Typography: `--evm-v4-type-*`
- Motion: `--evm-v2-motion-*`
- Color and surface: `--evm-v2-*`
- V3 helpers: `--evm-v3-opacity-disabled`, `--evm-v3-touch-target`, `--evm-v3-elevation-*`

## Accessibility and Responsive Contract
- Focus visibility on all actionable controls via `:focus-visible` outline.
- Minimum touch target preserved at 44px for primary controls.
- Reduced motion support through `prefers-reduced-motion: reduce`.
- Responsive breakpoints maintained for <=360, 361-412, 413-767, 768-1024, >=1025.

## Showcase Contract
- Single showcase page: `VITE_ENABLE_DS_SHOWCASE=true` with `/design-system` or `/ui-kit`.
- Demonstrates light/dark surfaces, list patterns, operation card usage, loading/empty states, and overlays.

## Delivery Notes
- Existing pages keep using current DS primitives; V3 aliases are additive.
- No business flow behavior changed in this sprint.
