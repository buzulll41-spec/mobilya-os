# DS-01 Design System Foundation

MOBILYA OS icin tek urun, tek tasarim dili ve responsive layout temeli bu fazda auth yuzeyinde kurulmustur.

## Design Tokens

### Color System

- `--ds-color-primary`: `#2563EB`
- `--ds-color-primary-hover`: `#1D4ED8`
- `--ds-color-secondary`: `#64748B`
- `--ds-color-success`: `#16A34A`
- `--ds-color-warning`: `#D97706`
- `--ds-color-danger`: `#DC2626`
- `--ds-color-surface`: `#FFFFFF`
- `--ds-color-surface-soft`: `rgba(255, 255, 255, 0.84)`
- `--ds-color-background`: `#F8FAFC`
- `--ds-color-background-strong`: `#EEF4FB`
- `--ds-color-border`: `rgba(148, 163, 184, 0.22)`
- `--ds-color-text-primary`: `#0F172A`
- `--ds-color-text-secondary`: `#64748B`
- `--ds-color-disabled`: `#CBD5E1`
- `--ds-color-hover`: `rgba(37, 99, 235, 0.08)`
- `--ds-color-focus`: `rgba(37, 99, 235, 0.18)`

### Typography

- `Display XL`: `clamp(3rem, 8vw, 5.75rem)`
- `Display L`: `clamp(2.5rem, 6vw, 4.5rem)`
- `Heading 1`: `clamp(2rem, 4vw, 3rem)`
- `Heading 2`: `clamp(1.5rem, 3vw, 2.25rem)`
- `Heading 3`: `1.25rem`
- `Body Large`: `1.0625rem`
- `Body`: `0.95rem`
- `Body Small`: `0.875rem`
- `Caption`: `0.75rem`
- `Button`: `0.95rem`

### Radius

- `XS`: `8px`
- `SM`: `12px`
- `MD`: `16px`
- `LG`: `24px`
- `XL`: `32px`
- `2XL`: `40px`
- `Pill`: `999px`

### Shadow

- `Small`: `0 8px 24px rgba(15, 23, 42, 0.06)`
- `Medium`: `0 18px 40px rgba(15, 23, 42, 0.1)`
- `Large`: `0 28px 70px rgba(15, 23, 42, 0.12)`
- `Floating`: `0 20px 50px rgba(37, 99, 235, 0.18)`
- `Modal`: `0 40px 100px rgba(15, 23, 42, 0.18)`

### Spacing

- `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`

### Animation

- `Fade`: `ds-fade`
- `Scale`: `ds-scale`
- `Slide`: `ds-slide-up`
- `Duration`: `0.25s`, `0.3s`, `0.35s`
- `Easing`: `cubic-bezier(0.22, 1, 0.36, 1)`

## Component Library

- Primary Button: `.ds-button.ds-button--primary`
- Secondary Button: `.ds-button.ds-button--secondary`
- Ghost Button: `.ds-button.ds-button--ghost`
- Icon Button: `.ds-icon-button`
- Input: `.ds-input`
- Search: `.ds-search`
- Card: `.ds-card`
- Modal: `.ds-modal`
- Avatar: `.ds-avatar`
- Badge: `.ds-badge`
- Chip: `.ds-chip`
- Tag: `.ds-tag`
- Notification: `.ds-notification`
- Bottom Sheet: `.ds-bottom-sheet`
- FAB: `.ds-fab`
- Top Bar: `.ds-top-bar`
- Bottom Navigation: `.ds-bottom-nav`
- Sidebar: `.ds-sidebar`

## Welcome Screen

Welcome screen, `LoginPage` icinde mevcut auth akisini degistirmeden ayni design-system siniflari ile kurulmustur.

## Responsive Davranis

- Mobile: tek kolon, tam ortali
- Tablet: ayni bilesenler, iki bolgeli layout baslangici
- Desktop: ayni bilesenler, daha genis bosluk ve sol agirlikli yerlesim

## Kullanilan Dosyalar

- `client/src/styles/design-system.css`
- `client/src/styles/login-page.css`
- `client/src/pages/LoginPage.jsx`
- `client/src/main.jsx`
- `docs/M-01_DESIGN_SYSTEM_FOUNDATION.md`