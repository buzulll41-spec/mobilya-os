# EVTREND Component Library V1

Status: Official baseline
Owner: Product Design + Frontend
Scope: Mobile-first UI kit for all EVTREND screens

## 0. Sprint 0 Outcome

This document is the only approved source for EVTREND UI components.
No new card, button, search box, tab, or list pattern can be introduced in screens without first being added here.

Decision flow:
1. Need found in a screen
2. Check this library
3. If missing, define in this library first
4. Review
5. Reuse in screens

Design goal:
A 100-screen product should still feel like one team, one language, one system.

---

## 1. Product Principles

1. Touch First
2. Action First
3. Less Text
4. Icon First
5. Apple Native feel
6. One Screen One Purpose
7. 3-second understanding rule
8. 09:00-21:00 fatigue-safe usage

---

## 2. Global Tokens

## 2.1 Radius
- Radius Small: 10 px
- Radius Medium: 16 px
- Radius Large: 22 px

## 2.2 Spacing
- XS: 4 px
- S: 8 px
- M: 12 px
- L: 16 px
- XL: 24 px

## 2.3 Shadow
- Card: 0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.06)
- Floating: 0 8px 24px rgba(16,24,40,0.14)
- Modal: 0 20px 48px rgba(16,24,40,0.22)

## 2.4 Typography
- Hero: 28/34, semibold
- Title: 20/26, semibold
- Body: 16/22, regular
- Caption: 13/18, medium

Preferred family:
- SF Pro Text
Fallback:
- Inter, system-ui, sans-serif

## 2.5 Icon
- Icon S: 16 px
- Icon M: 20 px
- Icon L: 24 px

## 2.6 Button
- Primary
- Secondary
- Ghost
- Danger

Button height minimum:
- 48 px

## 2.7 Color Intent
- Success Green: Completed or safe
- Active Orange: In progress and needs follow-up
- Risk Red: Delay or issue
- Info Blue: Informational or neutral action
- Production Purple: Production context

---

## 3. Motion System

Motion style: quick, meaningful, non-decorative

- Hover: 120 ms ease-out
- Pressed: 90 ms ease-out
- Focus ring appear: 80 ms ease-out
- Card reveal: 180 ms ease-out
- Chip selection: 120 ms ease-out

Interaction transforms:
- Hover: translateY(-1 px)
- Pressed: scale(0.985)
- Disabled: opacity 0.45

---

## 4. Component Specifications and Mockups

All components below include:
- Usage purpose
- Screens
- Dimensions
- Padding
- Radius
- Shadow
- Icon size
- Font
- States
- Animation
- Apple HIG checks

---

## 4.1 Large Module Card

Purpose:
Top-level module entry card for Home and module hubs.

Screens:
Home, quick-launch sections, role hubs.

Spec:
- Min height: 128 px
- Width: responsive full column
- Padding: XL
- Radius: Large
- Shadow: Card
- Icon: L
- Title: Title
- Meta text: Caption

State:
- Hover: lift -1 px
- Pressed: scale 0.985
- Focus: 2 px ring
- Disabled: muted icon + text

Animation:
- Enter fade-up 180 ms

Mockup:
- Icon block at top-left
- Module title below icon
- Small status badge at top-right
- Short action hint at bottom

Apple HIG checks:
- Tap target >= 48 px: Yes
- One-hand zone priority: Yes
- Contrast AA: Required

---

## 4.2 Order Card (Signature)

Purpose:
Single-glance process card for order lifecycle decisions.

Screens:
Order list, dashboard highlights, manager queue.

Spec:
- Min height: 238 px
- Padding: XL
- Radius: Large
- Shadow: Card
- Risk badge: top-right
- Active stage block: visual center and largest text
- Progress bar: under active stage
- Timeline: compact support layer
- Two CTA buttons at bottom: equal width

Anatomy:
1. Customer name (left)
2. Amount (right)
3. Risk badge (top-right corner)
4. Active stage headline
5. Progress bar + percent
6. Delivery date
7. Next step panel
8. Timeline mini row
9. Detail and Action buttons

State:
- Whole card clickable
- Hover and pressed feedback
- Focus-visible ring
- Disabled only for blocked cards

Animation:
- Progress updates animate width 220 ms
- Risk badge pulse only for critical delay, max once per card view

Mockup:
- Customer and amount top line
- Big active stage headline in center
- Progress and delivery line below
- Mini timeline support
- Next step chip/panel
- Two action buttons pinned bottom

Apple HIG checks:
- 3-second test ready: Yes
- 48 px controls: Yes
- Readability in motion context: Yes

---

## 4.3 Customer Card

Purpose:
Fast customer recognition and contact action.

Screens:
Customer list, order detail side panel, follow-up queues.

Spec:
- Height: 116 px
- Padding: L
- Radius: Medium
- Shadow: Card
- Icon/avatar: L
- Name: Title
- Secondary lines: Body/Caption

Content:
- Name
- Phone
- Last action
- Status

State:
- Fully tappable
- Focus ring
- Pressed state

Animation:
- 120 ms hover and pressed only

Mockup:
- Avatar left
- Name + phone center
- Status pill right
- Last action bottom row

---

## 4.4 Activity Card

Purpose:
Wallet-like timeline tile for recent events.

Screens:
Home recent activity, order detail activity feed.

Spec:
- Height: 88 px
- Padding: L
- Radius: Medium
- Shadow: Card
- Icon: L (dominant)

Content:
- Big icon
- One-line summary
- Time
- Full tap area

State:
- Full-card click
- Hover and pressed
- Focus-visible

Animation:
- Stagger reveal 90 ms between cards

Mockup:
- Icon left block
- Short event text center
- Time right

---

## 4.5 Timeline Component

Purpose:
Standalone or embedded process sequence.

Screens:
Order card, service flow, shipment flow, detail pages.

Spec:
- Row height: 24 px
- Dot size: 10 px
- Connector thickness: 2 px
- Step label: Caption

States:
- Completed: green check
- Active: orange filled dot
- Pending: neutral outline
- Risk: red marker overlay

Animation:
- Step transition 180 ms

Mockup:
- Horizontal compact row of 5 steps
- Optional vertical mode for details

---

## 4.6 Mini Widget Card

Purpose:
Critical micro-summary card for Home focus blocks.

Screens:
Home critical tasks, dashboard side strips.

Spec:
- Height: 92 px
- Padding: L
- Radius: Medium
- Shadow: Card
- Icon: M
- Number: Title
- Label: Caption

State:
- Tappable full area

Animation:
- Count update fade 120 ms

Mockup:
- Icon + metric top
- Short action hint bottom

---

## 4.7 KPI Card

Purpose:
Single metric emphasis card.

Screens:
Home KPI strip, manager overview, executive summary.

Spec:
- Height: 100 px
- Padding: L
- Radius: Medium
- Shadow: Card
- Number style: Hero
- Label: Caption

State:
- Optional tappable

Animation:
- Number ticker optional max 300 ms

Mockup:
- Big amount centered
- Label below

---

## 4.8 Filter Chips

Purpose:
Fast context filters with one-thumb usage.

Screens:
Order list, activity feeds, customer queues.

Spec:
- Height: 36 px visual, 48 px tap target
- Horizontal scroll row
- Radius: pill (9999 px)
- Padding chip: S/L

Default set:
- Tumu
- Bugun
- Geciken
- Uretim
- Tahsilat
- Sevkiyat

State:
- Default
- Selected
- Pressed
- Disabled
- Focus-visible

Animation:
- Selection fill transition 120 ms

Mockup:
- Sticky row under search bar

---

## 4.9 Search Bar

Purpose:
One standard search pattern for all mobile screens.

Screens:
All list and hub pages.

Spec:
- Height: 52 px
- Radius: Medium
- Padding horizontal: L
- Leading icon: M
- Clear button touch target: 48 px

State:
- Idle
- Focus
- Input
- Loading
- Error

Animation:
- Focus ring and shadow 100 ms

Mockup:
- Left search icon
- Placeholder
- Right clear/action

---

## 4.10 Header

Purpose:
Unified top structure across all mobile pages.

Screens:
All mobile screens.

Spec:
- Height: 56 px + safe area top
- Padding: L
- Title style: Title
- Optional right action icon

State:
- Static
- Scroll-condensed optional

Animation:
- Title fade between contexts max 120 ms

Mockup:
- Left title
- Right action icon button

---

## 4.11 Bottom Tab

Purpose:
Primary mobile navigation.

Screens:
Global mobile shell.

Spec:
- Height: 64 px + safe area bottom
- Icon size: M
- Label: Caption
- Active indicator line or filled state

State:
- Default
- Active
- Pressed
- Focus-visible

Animation:
- Active icon spring 140 ms subtle

Mockup:
- 3 to 5 tabs max
- Thumb zone first

---

## 4.12 Empty State

Purpose:
Zero-data moments without anxiety.

Screens:
Any empty list or no-result scenario.

Spec:
- Icon: L or illustration token
- Title: Title
- Body: Body
- Primary action button min 48 px

Tone:
- Calm and directive

Mockup:
- Icon top
- One-line title
- One action

---

## 4.13 Loading State (Skeleton)

Purpose:
Keep layout stable while content loads.

Screens:
All dynamic feeds and cards.

Spec:
- Skeleton blocks mirror real component sizes
- Shimmer speed: 1.2 s
- Radius follows target component

Mockup:
- Card skeleton with header, stage block, button placeholders

Rule:
No spinner-only pages for list content.

---

## 4.14 Error State (Premium)

Purpose:
Clear recovery with trust-preserving tone.

Screens:
API failure areas, partial load failures.

Spec:
- Icon + concise title
- One plain-language message
- Primary retry action
- Optional secondary help action

State:
- Non-blocking where possible

Mockup:
- Soft contrast card
- Retry prominent

---

## 4.15 Floating Action Button

Purpose:
Single dominant create/action shortcut.

Screens:
Home, orders, collection, shipment depending on role.

Spec:
- Size: 56 px
- Radius: 28 px
- Shadow: Floating
- Icon: L
- Label optional expanded mode

State:
- Default
- Pressed
- Disabled
- Focus-visible

Animation:
- Appear scale 160 ms
- Press feedback 90 ms

Mockup:
- Bottom-right anchored above tab bar and safe area

---

## 5. Screen-to-Component Usage Guide

Home:
- Header
- Search Bar
- Large Module Card
- Mini Widget Card
- Activity Card
- KPI Card
- Bottom Tab
- FAB

Order List:
- Header
- Search Bar
- Filter Chips
- Order Card
- Empty/Loading/Error states
- Bottom Tab
- FAB

Order Detail:
- Header
- Timeline Component
- Customer Card
- Activity Card
- KPI Card
- Error/Loading states

Customer Detail:
- Header
- Customer Card
- Activity Card
- Timeline Component

Collection, Service, Shipment:
- Header
- Search Bar
- Filter Chips
- Timeline Component
- Activity Card
- KPI Card
- Empty/Loading/Error

---

## 6. Interaction and Accessibility Rules

Mandatory:
- Minimum touch target: 48 px
- Color contrast: WCAG AA minimum
- Focus-visible rings on all interactive elements
- No information by color alone
- Thumb-friendly placement for primary actions

Fatigue-safe rule:
- Avoid dense paragraphs
- Keep single card scannable in under 3 seconds
- Cap visual accents to priority signals only

---

## 7. Governance and Review Checklist

Before adding a new UI pattern:
1. Is existing component adaptable?
2. If no, is new component broadly reusable?
3. Does it pass 3-second test?
4. Does it pass one-thumb test?
5. Is it documented in this file before screen use?

Release gate for design:
- Token compliance
- State completeness
- HIG check pass
- Role usability pass (sales, operations, store manager)

---

## 8. Official Rule from Sprint 0

No developer may ship a custom card, custom search, custom list, or custom button style outside this library.

If needed and missing:
- Add to this library first
- Review
- Then use in screens

This is the baseline for EVTREND visual consistency and velocity.
