# HOME V2 Screen Contract (EVTREND Mobile Workspace)

Status: Approved for pre-implementation lock
Date: 2026-08-02
Standard Source: EVTREND_MOBILE_PRODUCT_STANDARD_V1.md + MOBILYA_OS_MOBILE_DESIGN_LANGUAGE_V2.md

## 1. Screen Identity

- Screen Name: Home V2
- Purpose: Kullaniciya ilk 5 saniyede operasyon ozetini ve bugun yapilacak en kritik isleri gostermek
- Primary User: Mobile operasyon kullanicisi (Sales, Ops, Manager)
- Primary Action: Bugunun en kritik isine tek dokunusla gitmek
- Secondary Action: Hizli aksiyonlardan operasyon baslatmak

## 2. Mandatory Information Sequence (Non-changeable)

1. Ben kimim?
2. Bugun beni ne bekliyor?
3. En onemli islerim hangileri?
4. Hizli ne yapabilirim?
5. Son durum ne?

## 3. Fixed Layout Order (Non-changeable)

1. Safe Area
2. Premium Header
3. Global Search
4. Operation Summary (single premium component)
5. Today's Focus (max 4 rows)
6. Quick Actions (2x2)
7. Recent Activity (max 5 records)
8. Bottom Navigation (fixed)

## 4. Component Contract

### Premium Header
- Contains: Gunaydin, Kullanici, Magaza, Profil, Bildirim
- Rule: Sadece kimlik ve baglam bilgisi verir; KPI barindirmaz

### Global Search
- Full width, single field
- Placeholder: "Siparis, musteri, telefon, urun..."

### Operation Summary
- Single premium card
- Contains at a glance:
  - Tahsilat
  - Siparis
  - Sevkiyat
  - Servis
  - Musteri
  - Bugunku KPI
- Rule: Liste yapisi kullanilmaz

### Today's Focus
- Max 4 rows
- Each row:
  - Baslik
  - Aciklama
  - Durum
  - Sag ok

### Quick Actions
- 2x2 grid
- Items:
  - Yeni Siparis
  - Tahsilat
  - Sevkiyat
  - Servis

### Recent Activity
- Max 5 events
- Compact timeline-style chronology

### Bottom Navigation
- Fixed, always visible

## 5. Visual Language Rules

- Home is not a dashboard
- Home is not a long list screen
- Home is a workspace entry surface

Token and style discipline:
- Use design tokens only
- Color emphasis only for:
  - Primary
  - Success
  - Warning
  - Danger
- Other surfaces and text are neutral

Density and focus discipline:
- Fewer cards
- Larger white space
- Clear hierarchy
- Strong top focus on Operation Summary

## 6. Explicit Prohibitions

- Dashboard boxes
- Legacy colorful KPI boxes
- Widget crowding
- Unnecessary KPI blocks
- 6 side-by-side cards
- Card-inside-card patterns
- Any component carried from legacy Home

## 7. Role Variants (Content only, same structure)

- Sales variant: order and collection priority
- Ops variant: shipment and service priority
- Manager variant: KPI and risk priority

Rule:
- Layout and component structure never changes by role
- Only data ordering and label emphasis may vary

## 8. Quality Gate for Implementation Start

Implementation can start only if all are true:
1. This contract is approved
2. High-fidelity mockup is approved
3. Design token mapping is complete
4. Component readiness for Header/Search/Summary/Focus/QuickAction/Activity/Nav is confirmed

## 9. Freeze Rule

After implementation approval:
- UI Freeze applies
- Changes allowed only for:
  1. Critical usability issue
  2. Technical defect
  3. New business requirement
