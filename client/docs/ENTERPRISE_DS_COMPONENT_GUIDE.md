# Enterprise Design System Component Guide

This guide defines how shared mobile components must be used during the stabilization sprint.

## Rules

- Use shared DS components first; do not add screen-local button, chip, card, or header variants.
- Keep props explicit; avoid hidden defaults in page code.
- Do not style DS internals from screen CSS unless there is a temporary migration exception.

## Components

### AppHeader
- Purpose: Standard top identity area for every mobile screen.
- Props: eyebrow, title, subtitle, meta, unreadCount, initials, onOpenMenu, aside.
- Example:
```jsx
<AppHeader title="Sevkiyat" subtitle="Bugunku plan" initials="MO" onOpenMenu={openMenu} />
```
- Forbidden usage: Creating page-local header wrappers that duplicate the same title/subtitle/meta pattern.

### SearchBar
- Purpose: Unified searchable input with optional refresh action.
- Props: value, onValueChange, placeholder, onRefresh.
- Example:
```jsx
<SearchBar value={query} onValueChange={setQuery} placeholder="Musteri ara" />
```
- Forbidden usage: Custom search containers with new class names for spacing, icon, or border behavior.

### FilterChips
- Purpose: Shared tab-like filter selector with counters.
- Props: items, activeId, onSelect, ariaLabel.
- Example:
```jsx
<FilterChips items={filters} activeId={activeFilter} onSelect={setActiveFilter} />
```
- Forbidden usage: Re-implementing chip bars with page-local chip classes.

### MobileScreenShell
- Purpose: Single layout contract for header, search, filter, primary, secondary, and FAB regions.
- Props: className, header, search, filter, primary, secondary, fab, children.
- Example:
```jsx
<MobileScreenShell header={headerNode} search={searchNode} primary={listNode} />
```
- Forbidden usage: New page container structures that bypass shell slots.

### PrimaryListItem
- Purpose: Standard mobile card-row for operational entities.
- Props: title, subtitle, metaLeft, metaRight, badge, trailing, onPress, className.
- Example:
```jsx
<PrimaryListItem title={row.customer} subtitle={row.region} onPress={openOrder} />
```
- Forbidden usage: Rebuilding item cards with custom typography and spacing styles.

### Badge
- Purpose: Shared status indicator across modules.
- Props: label, tone, count.
- Example:
```jsx
<Badge label="Yolda" tone="blue" count={3} />
```
- Forbidden usage: Inline span-based status pills with page-local colors.

### PrimaryButton
- Purpose: Main action CTA.
- Props: Standard button props (+ className).
- Example:
```jsx
<PrimaryButton onClick={save}>Kaydet</PrimaryButton>
```
- Forbidden usage: Raw button styles for primary actions.

### SecondaryButton
- Purpose: Secondary/neutral action CTA.
- Props: Standard button props (+ className).
- Example:
```jsx
<SecondaryButton onClick={cancel}>Vazgec</SecondaryButton>
```
- Forbidden usage: Page-specific secondary button variants with custom radii and shadows.

### EmptyState
- Purpose: Empty list/content state with clear message and optional action.
- Props: title, description, actionLabel, onAction.
- Example:
```jsx
<EmptyState title="Kayit yok" description="Filtreyi temizleyin" />
```
- Forbidden usage: Local empty state card implementations.

### LoadingSkeleton
- Purpose: Shared loading placeholder rows.
- Props: rows.
- Example:
```jsx
<LoadingSkeleton rows={6} />
```
- Forbidden usage: New page-specific skeleton animations.

### ErrorState
- Purpose: Standard recoverable error state.
- Props: title, description, actionLabel, onAction.
- Example:
```jsx
<ErrorState title="Baglanti sorunu" description="Tekrar deneyin" onAction={retry} />
```
- Forbidden usage: Inline ad-hoc error alerts with unique styling.

### OfflineState
- Purpose: Offline-aware fallback state.
- Props: title, description, actionLabel, onAction.
- Example:
```jsx
<OfflineState title="Offline mod" description="Senkronizasyon bekleniyor" />
```
- Forbidden usage: Separate offline card components per module.

### BottomNavigation
- Purpose: Unified bottom navigation for core mobile sections.
- Props: page, onNavigate, onPrimaryAction.
- Example:
```jsx
<BottomNavigation page={page} onNavigate={setPage} onPrimaryAction={openQuickActions} />
```
- Forbidden usage: Creating page-level tab bars.

### FloatingActionButton
- Purpose: Shared floating primary action trigger.
- Props: label, icon, onPress, ariaLabel.
- Example:
```jsx
<FloatingActionButton label="Yeni" onPress={onCreate} />
```
- Forbidden usage: Custom fixed action buttons with non-DS motion or size.

### Toast
- Purpose: Short, non-blocking feedback.
- Props: message.
- Example:
```jsx
<Toast message="Kayit guncellendi" />
```
- Forbidden usage: Module-specific toast visual variants.

### BottomSheet
- Purpose: Shared sheet pattern for mobile contextual flows.
- Props: open, title, children.
- Example:
```jsx
<BottomSheet open={open} title="Hizli islemler">...</BottomSheet>
```
- Forbidden usage: New sheet containers with custom animation language.

### Modal and ConfirmationDialog
- Purpose: Blocking confirmation and focused dialogs.
- Props:
  - Modal: open, title, children
  - ConfirmationDialog: open, title, description, onConfirm, onCancel
- Example:
```jsx
<ConfirmationDialog open={open} title="Sil" description="Devam etmek istiyor musunuz?" onConfirm={confirm} onCancel={cancel} />
```
- Forbidden usage: Rebuilding modal overlays with custom z-index and backdrop rules.

## Migration Notes

- Keep legacy classes only where business-safe migration is still in progress.
- New page work is blocked until scorecard gates are met in the stabilization report.
