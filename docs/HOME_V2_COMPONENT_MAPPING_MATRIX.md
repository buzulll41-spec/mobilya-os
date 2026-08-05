# HOME V2 Component Mapping Matrix

Status: Pre-implementation
Date: 2026-08-02

## Contract -> Component Mapping

Section | DS Component | Status | Notes
--- | --- | --- | ---
Safe Area | SafeArea (foundation) | Ready | Existing foundation
Header | HomeHeaderPremium (new) | Missing | New component, no legacy reuse
Global Search | SearchBar (existing) + HomeSearchShell (new) | Partial | SearchBar exists, shell variant needed
Operation Summary | OperationSummaryCardPremium (new) | Missing | Single premium summary component
Today's Focus | FocusList (new) + FocusRow (new) | Missing | Max 4 rows, status + arrow
Quick Actions | QuickActionGrid (new) + QuickActionTile (new) | Missing | Strict 2x2, role-aware content
Recent Activity | ActivityTimelineCompact (new) + ActivityRow (new) | Missing | Max 5 records
Bottom Navigation | BottomNavigation (existing) | Ready | Existing DS component

## Variant Rules

- Layout is fixed for all roles
- Only content ordering changes by role:
  - Sales: collection/order first
  - Ops: shipment/service first
  - Manager: KPI/risk first

## Token Dependency Map

Component | Required token groups
--- | ---
HomeHeaderPremium | typography, spacing, color, icon, touchTarget, safeArea, opacity
HomeSearchShell | spacing, radius, border, color, motion, transition
OperationSummaryCardPremium | spacing, radius, shadow, elevation, typography, color
FocusList/FocusRow | spacing, typography, color, border, icon
QuickActionGrid/Tile | spacing, radius, icon, touchTarget, motion, transition
ActivityTimelineCompact/Row | spacing, typography, color, opacity, border
BottomNavigation | spacing, icon, touchTarget, color, zIndex

## Build Order

1. HomeHeaderPremium
2. OperationSummaryCardPremium
3. FocusRow + FocusList
4. QuickActionTile + QuickActionGrid
5. ActivityRow + ActivityTimelineCompact
6. HomeSearchShell
7. HomeV2 composition screen
