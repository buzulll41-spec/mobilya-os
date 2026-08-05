# EVTREND / MOBILYA OS ENTERPRISE PRODUCT REBUILD V1 - Audit Report

Status: Draft for Product Owner approval
Date: 2026-08-02
Scope: client/src (read-only audit, no deletion, no refactor applied)

## 0) Method

This report was produced with static scan + naming heuristics.
No file was deleted.
No runtime behavior was changed.

Important limitation:
- "Unused" findings are candidate-level and require runtime confirmation because dynamic imports, route-level lazy loading, and string-built class names may hide references from static scan.

## 1) Project Health Score (/100)

- Project health score: 62/100

Scoring rationale:
- + Stable monorepo and existing design-system baseline
- + Existing showcase page available
- - High token escape count in CSS and JSX
- - Large amount of page-scoped CSS
- - Design System coverage is partial vs target token/component matrix
- - Multiple parallel UI patterns (desktop + mobile + legacy)

## 2) Technical Debt Score

- Technical debt score: 74/100 (higher = more debt)

Debt drivers:
- Inline style usage: 100 matches in source
- Hardcoded color literals: 4875 matches
- Hardcoded spacing/radius/typography patterns in CSS: 5345 matches
- Component files outside DS: 382 out of 413 component files

## 3) Design System Completion Percentage

- Design System completion: 54%

Evidence:
- Token files present: color, spacing, typography, radius, shadow, elevation, animation
- Token files missing for requested matrix: duration, opacity, border, touch-target, breakpoint, z-index, safe-area
- Existing exports include foundations and DS entrypoint

References:
- client/src/design-system/tokens
- client/src/design-system/index.ts

## 4) Component Library Completion Percentage

- Component Library completion: 42%

Evidence:
- DS component registry currently exports 23 components
- Target list in rebuild brief is much larger and requires full state variants for each component
- Existing showcase demonstrates multiple states but not full matrix (compact/large/warning coverage is incomplete for many components)

References:
- client/src/design-system/components/index.ts
- client/src/design-system/DesignSystemV1Showcase.tsx
- client/src/pages/DesignSystemShowcasePage.jsx

## 5) Duplicate Code Analysis

Summary:
- Exact duplicate CSS file by content hash: not found
- Duplicate component file names found across folders (risk of drift/confusion):
  - OrdersPage.jsx (4)
  - DashboardPage.jsx (2)
  - HomePage.jsx (2)
  - AppleNativeHomePage.jsx (2)

Interpretation:
- Even without exact file clones, naming collisions and parallel implementations indicate semantic duplication risk.

## 6) CSS Simplification Report

Current CSS surface:
- Total CSS files in client/src: 82
- CSS files in client/src/styles: 72
- Page-scoped CSS files in styles by naming heuristic: 33

Property-level hardcoded declaration counts (CSS):
- margin: 215
- padding: 1083
- gap: 1270
- border-radius: 788
- font-size: 1988
- line-height: 1

Candidate orphan CSS files (name not referenced in JS/TS source): 11

Top candidate list:
- client/src/mobile/home/AppleNativeHomePage.css
- client/src/styles/collection-command-center.css
- client/src/styles/collection-desk.css
- client/src/styles/collection-erp.css
- client/src/styles/collection-hybrid.css
- client/src/styles/dashboard-control-tower.css
- client/src/styles/design-system-showcase.css
- client/src/styles/order-operation-cards.css
- client/src/styles/shipment-calendar.css
- client/src/styles/shipment-operations.css
- client/src/styles/shipment-ops-v3.css

## 7) Migration Plan

Migration order (as requested):
1. Home
2. Siparis
3. Tahsilat
4. Sevkiyat
5. Servis
6. Musteri
7. Raporlar
8. Operasyon
9. SSH
10. Ayarlar

Execution model for each module:
1. Token compliance pass
2. Component extraction to DS library
3. Showcase entry and variant matrix completion
4. Screen composition rewrite on shared page skeleton
5. Backend integration verification
6. Pixel QA + regression + visual snapshot gate

Gate rule:
- Old screen is not removed until new screen is functionally equivalent and QA-green.

## 8) First Screen Rewrite Recommendation

Recommendation: Home V2 first.

Reason:
- Home is the reference language for all downstream modules.
- Existing standards already position Home as the anchor.
- Highest leverage for page skeleton, Search/Header behavior, priority/task language, and quick action patterns.

## 9) Estimated Remaining Work Plan

Phase plan (estimate):
- Phase A (1-2 weeks): Token system completion + DS governance + lint guardrails
- Phase B (2-4 weeks): Enterprise component library expansion + full state matrix + showcase hardening
- Phase C (6-10 weeks): Module-by-module migration in requested order with QA gates
- Phase D (1-2 weeks): Final regression, visual baseline lock, release checklist

Total estimate:
- 10-18 weeks, depending on team size, QA bandwidth, and backend dependency coupling.

## 10) Critical Risks and Mitigation

Risk 1: Parallel UI systems continue to diverge
- Mitigation: Block new screen code outside DS pipeline; enforce token/component gates in PR checklist.

Risk 2: Hidden runtime dependencies in "unused" candidates
- Mitigation: Add import graph + route map validation before cleanup changes.

Risk 3: Migration speed breaks visual consistency
- Mitigation: Visual regression baseline per module + snapshot fail-on-diff in CI.

Risk 4: Token matrix remains incomplete
- Mitigation: Finish missing token categories first (duration, opacity, border, touch-target, breakpoint, z-index, safe-area).

Risk 5: Home V2 freezes too late
- Mitigation: Define Home screen contract early, freeze after QA pass, then enforce downstream reuse.

---

## Appendix A - Required Project Audit Outputs (requested checklist)

Requested item | Current status
--- | ---
Unused components | Candidate list produced (16 candidates; runtime confirmation needed)
Duplicate components | Naming collisions identified (OrdersPage, DashboardPage, HomePage, AppleNativeHomePage)
Duplicate CSS files | No exact duplicate hash found
Unused CSS classes | Needs runtime-assisted selector usage tracing to be exact
Inline style usage | 100 matches
Hardcoded color usage | 4875 matches
Hardcoded spacing usage | Included in CSS hardcoded metrics (margin/padding/gap)
Hardcoded radius usage | Included in CSS hardcoded metrics (border-radius)
Hardcoded typography usage | Included in CSS hardcoded metrics (font-size/line-height)
Page-based CSS files | 33 files (naming heuristic)
Components created outside Design System | 382 of 413 component files are outside DS folders

## Approval Gate

No new screen development should start before this report is approved.
