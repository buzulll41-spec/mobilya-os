# HOME V2 Pre-Implementation Gate

Status: Ready
Date: 2026-08-02

## Decision

Home V2 will be implemented as a new workspace screen, not as a patch of legacy Home.

## Approved Scope

- Premium Header
- Global Search
- Operation Summary (single premium card)
- Today's Focus (max 4)
- Quick Actions (2x2)
- Recent Activity (max 5)
- Bottom Navigation

## Non-Goals

- No legacy Home component reuse
- No dashboard reconstruction
- No extra KPI wall
- No local styling decisions outside design tokens

## Pre-Implementation Checklist

- [x] Product standard locked
- [x] Enterprise rebuild directive documented
- [x] Design token foundation completed (Sprint 1)
- [x] Home V2 screen contract documented
- [x] High-fidelity mockup direction approved
- [ ] Foundation components for Home V2 finalized in DS library
- [ ] Showcase entries for Home V2 components finalized
- [ ] Migration plan task breakdown finalized

## Implementation Sequence (Home V2 only)

1. Map contract sections to DS components
2. Create missing foundation components in DS library
3. Add variants to showcase
4. Compose Home V2 screen from DS components only
5. Connect backend data adapters
6. Run QA gate (responsive + accessibility + visual regression)
7. Freeze UI on approval

## Success Criteria

In first 5 seconds user can answer:
1. Ben kimim?
2. Bugun beni ne bekliyor?
3. En onemli islerim hangileri?
4. Hizli ne yapabilirim?
5. Son durum ne?

## Deliverables for Next Step

- Component mapping matrix (Contract -> DS component)
- Home V2 migration task list (small safe steps)
- QA baseline checklist for visual and behavior parity

Linked documents:
- docs/HOME_V2_COMPONENT_MAPPING_MATRIX.md
- docs/HOME_V2_MIGRATION_TASK_LIST.md
- docs/HOME_V2_QA_BASELINE_CHECKLIST.md
