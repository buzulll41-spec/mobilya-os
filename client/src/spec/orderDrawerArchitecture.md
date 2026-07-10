# Order Drawer — Mimari Spec (v1, onaylı)

## Spec 5 — Global Operasyon Kilitleri

Sistem genelinde **aynı kurallar** drawer, sevk planı ve kuyruk CTA’larında uygulanır. Kilitler `computeGlobalOperationLocks(order, dto, todayIso)` ile türetilir.

### Kilit kimlikleri

| ID | Koşul | Etki | Mesaj (TR) |
|----|--------|------|------------|
| `SSH_BLOCKS_SHIPMENT` | `openMissingItemsCount > 0` | Sevk planı / sevk ilerletme **blok** | N açık eksik parça — sevk kilidi |
| `BALANCE_BLOCKS_SHIPMENT` | `amountDue > 0` ve (overdue veya kalan > %40 satış) | Sevk planı **uyarı/blok** (yönetici bypass yok — spec: politika) | Tahsilat tamamlanmadan sevk riski |
| `PRODUCTION_NOT_READY` | Üretim hazır değil ve sevk planı isteniyor | Sevk planı **uyarı** | Üretim / eksik ürün tamamlanmalı |
| `SHIPMENT_ISSUE` | `hasShipmentIssue` | Sevk durum güncelleme **blok** | Sevk / montaj sorunu açık |
| `RECEIPT_PENDING` | `riskSignalDueDatePendingReceive` | Sevk **uyarı** | Fiziksel geliş eksik |

### Öncelik (banner)

1. `SSH_BLOCKS_SHIPMENT` (critical)  
2. `SHIPMENT_ISSUE` (critical)  
3. `BALANCE_BLOCKS_SHIPMENT` (warning)  
4. `PRODUCTION_NOT_READY` (warning)  
5. `RECEIPT_PENDING` (info)

### Davranış

- **Blok:** İlgili primary/secondary CTA `disabled`; tooltip = kilit mesajı.
- **Uyarı:** CTA aktif; üst banner + sevk sekmesinde şerit.
- **Rol:** Yönetici kilitleri **kaldıramaz**; yalnızca audit ile istisna (ileride).
- **Kaynak:** Drawer, `ShipmentOpsPlanModal`, kuyruk “Sevk planla” hızlı aksiyonu aynı `isActionBlockedByLocks(action, locks)` fonksiyonunu kullanır.

### API (client)

```js
computeGlobalOperationLocks(order, dto, todayIso) → OperationLock[]
isOperationLocked(locks, lockId) → boolean
getPrimaryLockBanner(locks) → { severity, message } | null
blocksShipmentPlanning(locks) → boolean
```

---

## Uygulama durumu (v1)

| Öncelik | Konu | Kod |
|--------|------|-----|
| 1 | `openOrderDrawer` | `OrderDrawerProvider`, `App.openOrderDetail` → wrapper |
| 2 | Kuyruk bağlamı | `buildDrawerQueue` — Dashboard, Orders, Collection, Shipment, SSH |
| 3 | Sonraki / Önceki | `goToPrevOrder` / `goToNextOrder`, Alt+←/→, kuyruk etiketi |
| 4 | Rol CTA | `orderDrawerPermissions.resolveDrawerPrimaryCta` |
| 5 | Lifecycle başlık + özet | `orderLifecycleProjection`, `OrderDrawerSummaryStrip` |
| 6 | Operasyon kilitleri | `globalOperationLocks.js`, `OrderDrawerLockBanner` |

Sözleşme tipleri: `client/src/contracts/orderDrawer.js`.

Specs 1–4: onaylı mimari (başlık alanları, rol matrisi, `openOrderDrawer`, kuyruk navigasyonu).
