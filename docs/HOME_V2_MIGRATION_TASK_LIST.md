# HOME V2 Migration Task List

Status: Ready
Date: 2026-08-02

## Phase 1 - Component Foundation (No screen patch)

1. Create HomeHeaderPremium in DS library
2. Create OperationSummaryCardPremium in DS library
3. Create FocusRow and FocusList in DS library
4. Create QuickActionTile and QuickActionGrid in DS library
5. Create ActivityRow and ActivityTimelineCompact in DS library
6. Create HomeSearchShell wrapper in DS library

Constraints:
- No inline style
- No hardcoded color/radius/shadow/typography/spacing
- Token-only styling

## Phase 2 - Showcase Coverage

1. Add all Home V2 components to showcase
2. Provide variants:
   - default
   - loading
   - error
   - success
   - disabled
   - selected
   - compact
   - large
3. Add role content examples (Sales/Ops/Manager)

## Phase 3 - Home V2 Composition

1. Compose Home V2 only from DS components
2. Keep fixed order from screen contract
3. Enforce limits:
   - Focus rows <= 4
   - Activity rows <= 5
4. Keep summary as single premium card

## Phase 4 - Data Integration

1. Map backend data to summary model
2. Map tasks to focus model
3. Map events to activity model
4. Add fail-safe loading/error/empty states

## Phase 5 - QA and Freeze

1. Responsive verification (mobile first)
2. Accessibility checks (touch target >= 44)
3. Visual regression baseline capture
4. UI freeze after approval

## Rollback Safety

- Legacy Home remains untouched until Home V2 QA green
- No destructive cleanup in this phase
