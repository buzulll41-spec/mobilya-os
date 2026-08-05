# DS-02 Component Library

DS-02, MOBILYA OS icin ortak component kutuphanesini React primitive + CSS class mimarisi ile kurar.

## Component Listesi

- Primary Button
- Secondary Button
- Ghost Button
- Icon Button
- Text Input
- Search Input
- Password Input
- Card
- Stat Card
- Action Card
- Avatar
- Badge
- Chip
- Tag
- Alert
- Toast
- Modal
- Bottom Sheet
- Drawer
- Top App Bar
- Bottom Navigation
- Sidebar
- List Item
- Section Header
- Divider

## Durumlar

- Default: her component temel sinif ile gelir
- Hover: `:hover` durumlari `design-system.css` icinde tanimlidir
- Active: `data-active='true'` ile stillenir
- Disabled: `:disabled` veya ilgili opacity/cursor stilleri vardir
- Loading: buton ailesinde `loading` prop'u ve `.ds-loader` kullanilir

## Mimari

- `client/src/components/design-system/DSComponents.jsx`: ortak React primitive katmani
- `client/src/styles/design-system.css`: token + component state stilleri
- `client/src/pages/LoginPage.jsx`: library kullanan mevcut auth yuzeyi

## Responsive

- Bilesenler mobile-first olusturuldu
- Modal, drawer, bottom-sheet 900px altinda tam genislik davranisina gecer
- Top bar, section header, nav ve sidebar layoutlari kucuk ekranlarda yeniden akar