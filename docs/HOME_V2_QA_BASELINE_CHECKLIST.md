# HOME V2 QA Baseline Checklist

Status: Pre-implementation
Date: 2026-08-02

## UX Acceptance

- [ ] User identity is clear in 2 seconds
- [ ] Today's operation summary is clear in 5 seconds
- [ ] Top priorities are visible without scroll confusion
- [ ] Quick actions are immediately tappable
- [ ] Recent activity gives context without noise

## Layout Contract

- [ ] Section order matches screen contract exactly
- [ ] Operation Summary is single premium component
- [ ] Focus row count is max 4
- [ ] Activity row count is max 5
- [ ] Bottom navigation is fixed

## Design Token Compliance

- [ ] No inline style
- [ ] No hardcoded color
- [ ] No hardcoded spacing
- [ ] No hardcoded radius
- [ ] No hardcoded shadow
- [ ] No hardcoded typography

## Accessibility

- [ ] Touch targets >= 44x44
- [ ] Contrast ratio is acceptable for primary text
- [ ] Focus states visible and consistent
- [ ] Screen reader labels exist for key actions

## Performance

- [ ] Initial render remains responsive on mobile
- [ ] No blocking layout shifts in summary/focus/activity
- [ ] Component transitions are smooth and brief

## Regression

- [ ] Screenshot baseline captured
- [ ] Visual diff threshold defined
- [ ] Existing routes unaffected
- [ ] Legacy Home remains available until cutover
