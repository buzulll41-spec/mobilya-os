# MOBILYA OS — PROJECT STATE

**Güncelleme:** 2026-05-21  
**Checkpoint:** Foundation v1 + Pilot Auth + Sipariş Detay V10  
**Monorepo:** `client/` (React 19 + Vite 8) · `backend/` (Fastify + Prisma + PostgreSQL)

---

## 1. Özet

MOBILYA OS, mobilya mağazası operasyonlarını (satış → üretim → sevk → montaj → SSH → tahsilat) tek ekranda yöneten bir ERP istemcisidir. İstemci hem **mock bellek store** hem de **canlı API** modunda çalışır; backend PostgreSQL üzerinde JWT kimlik doğrulama, RBAC ve geniş mutasyon API’si sunar.

Referans demo günü: **`2026-05-14`** (`DEMO_TODAY`, client + backend uyumlu).

| Katman | Durum |
|--------|--------|
| Client UI & mock motor | Olgun — V10 sipariş detay tamamlandı |
| Backend READ + mutasyon API | Olgun — pilot kullanıma hazır |
| Auth / RBAC | Tamamlandı (JWT, roller, kullanıcı yönetimi) |
| E2E / Playwright doğrulama | V10 stabilizasyon senaryosu geçti |
| Unit / integration testleri | ~85 client + 24 backend test dosyası; 3 flaky test stabilizasyonu devam ediyor |
| Production deploy | Henüz yok — pilot / geliştirme aşaması |

---

## 2. Mimari

```
┌─────────────────────────────────────────────────────────────┐
│  client/ (React SPA)                                        │
│  pages · features · mappers · application · contracts/v1    │
│  mockApi (bellek)  ←── hybrid ──→  apiClient → backend     │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP (VITE_API_BASE_URL)
┌───────────────────────────────▼─────────────────────────────┐
│  backend/ (Fastify)                                         │
│  Prisma → PostgreSQL · JWT auth · RBAC · domain events      │
└─────────────────────────────────────────────────────────────┘
```

**Veri modları**

| Mod | Koşul | Gösterge |
|-----|--------|----------|
| Mock | `VITE_API_BASE_URL` boş | Üst çubuk: **Mock veri** |
| API | `VITE_API_BASE_URL=http://localhost:4000` | **Canlı API: …** |

API modunda liste, mutasyonlar, domain event, görev overlay ve çoğu operasyon gerçek backend’e gider. Mock mod tüm akışı bellek içinde simüle eder.

---

## 3. Tamamlanan modüller

### 3.1 Foundation v1 (Client)

- **Wire contract’lar** (`client/src/contracts/v1/`): `SalesOrderListItemDto`, domain event, görev, para, enum’lar
- **Application katmanı**: `orderMutationOrchestration`, `orderSnapshotSync`, `projectSalesOrderListItemDto`
- **Projection pipeline**: legacy order → wire DTO → sevkiyat / ödeme / risk zenginleştirme
- **Mock aggregate’ler**: sipariş, sevkiyat, ödeme, domain event, görev, SSH, tedarikçi, gelen ürün, ürün kartı
- **Operasyonel görev motoru**: `operationalTaskSync` — DTO’lardan kural görevleri üretir
- **Debug paneli**: yalnızca DEV — pipeline / replay / görev gerekçesi
- **Dokümantasyon**: [FOUNDATION_V1.md](./FOUNDATION_V1.md)

### 3.2 Backend Foundation + Pilot API

- **PostgreSQL + Prisma** — `SalesOrder`, `OrderLine`, `Payment`, `Shipment`, `ShipmentPlan`, `OrderMissingItem`, `Supplier`, `IncomingGoods`, `Product`, `User`, `TaskState`, `DomainEvent`, …
- **Auth**: `POST /v1/auth/login`, `GET /v1/auth/me`, JWT middleware
- **RBAC**: ADMIN, MANAGER, SALES, OPERATION, WAREHOUSE — endpoint + UI erişim kontrolü
- **Mutasyon API’leri**: sipariş oluştur, durum/termin, ödeme, sevk, SSH, tedarikçi, gelen ürün, ürün kartı, shipment plan/group, domain event append
- **READ projection**: `GET /v1/orders` → client ile aynı `SalesOrderListItemDto` kuralları
- **Seed**: demo siparişler, 51 ürün kartı, 5 tedarikçi, pilot kullanıcılar
- **Dokümantasyon**: [BACKEND_FOUNDATION_V1.md](./BACKEND_FOUNDATION_V1.md) · [PILOT_STORE_CHECKLIST.md](./PILOT_STORE_CHECKLIST.md)

### 3.3 Kimlik doğrulama & roller

| Rol | Özet yetki |
|-----|------------|
| ADMIN / MANAGER | Tüm modüller + kullanıcı yönetimi |
| SALES | Sipariş, tahsilat, sözleşme, ürün kartı |
| OPERATION | Sipariş görüntüle, durum, sevk, SSH |
| WAREHOUSE | Gelen ürün, tedarik okuma, sevk hazırlık |

- Login: `admin@mobilya.local` / `admin123` (seed)
- Görev overlay API modunda kullanıcı bazlı DB (`TaskState`)
- Actor audit: mutasyonlarda gerçek kullanıcı adı

### 3.4 Ana sayfalar (Client)

| Sayfa | Modül | Durum |
|-------|--------|-------|
| Dashboard | KPI strip, hot sales pulse, control tower, bugün feed | ✅ |
| Siparişler | Liste, filtre, yeni sipariş sihirbazı, sipariş detay paneli | ✅ |
| Ürün Kartları | Katalog CRUD, katalog seçici | ✅ |
| Tedarik & Gelen Ürün | Tedarikçi, cari, gelen ürün kaydı | ✅ |
| Sevk Operasyonu | Pipeline, haftalık takvim, durak detayı, sevk planı, irsaliye | ✅ |
| Tahsilat | Bakiye listesi, ödeme girişi | ✅ |
| SSH / Servis Merkezi | Eksik parça kuyruğu | ✅ |
| Kullanıcılar | ADMIN/MANAGER — hesap yönetimi | ✅ |

### 3.5 Sipariş oluşturma (New Order Wizard)

- 4 adım: Müşteri → Ürünler (katalog) → Ödeme → Özet
- Çok satırlı sipariş, iskonto, mail order, ürün konfigürasyon şeması (kumaş, gardırop, …)
- Sözleşme yazdırma (PDF) + domain event
- Mock + API create parity

### 3.6 Sevk operasyonu (V3–V8)

- Pipeline board, KPI strip, fırsat paneli, araç/ekip planlama
- Haftalık takvim + bugün paneli
- `ShipmentOperationModal`, `ShipmentStopDetailPanel` — geri dönüş, adım stepper
- Sevk planı CRUD (mock + API), kısmi sevk, politika override (`allowReceivingRisk`)
- Dispatch sheet yazdırma

### 3.7 Risk motoru (liste + drawer)

**Dosyalar:** `mappers/risk/applyCompositeListItemRisk.js`, `riskDrawerUi.js`

- Composite risk: termin gecikmesi, kısmi sevk, açık SSH, bakiye, sevk sorunu
- `currentRiskSeverity` → liste badge + sipariş detay risk kartı
- Debug açıklaması: `explainCompositeListItemRiskForDebug`

**V10 risk kartı:** `OrderPanelRiskCard.jsx` — emoji seviye (🟢/🟡/🔴), Türkçe gerekçe satırları

### 3.8 Sipariş detay V9 → V10

**Ana bileşen:** `features/orders/OrderOperationPanel.jsx`  
**Sekmeler (6):** Genel Bakış · Ürünler · Ödemeler · Sevk & Montaj · SSH / Eksik Parça · Geçmiş

#### V9 (UX refactor)

- Tab yapısı, müşteri iletişim kartı, operasyon özeti
- Türkçe audit feed, konfigürasyon kart grid
- Sadeleştirilmiş KPI’lar (4 kart), risk kartı

#### V10 alt fazları (tamamlandı)

| Faz | Özellik | Dosyalar |
|-----|---------|----------|
| V10.1 | **Sağlık barı** — 🟢/🟡/🔴 ton, Tahsilat/Operasyon/Kritik etiketleri | `orderHealthBarModel.js`, `OrderPanelHealthBar.jsx` |
| V10.2 | **Sevk uygunluk skoru** — 0–100 + checklist (ürün, araç, ekip, SSH, bakiye) | `shipmentReadinessScore.js`, `OrderPanelShipmentReadiness.jsx` |
| V10.3 | **Geçmiş filtreleri** — Tümü, Tahsilat, Sevk, SSH, Görev, Sistem | `OperationAuditFeed.jsx` (`AUDIT_FEED_FILTERS`) |
| V10.4 | **Bugün komut kartı** — operasyon önceliği | `orderTodayCommandModel.js`, `OrderPanelTodayCommand.jsx` |
| V10.5 | **Müşteri iletişim aksiyonları** — Ara, WhatsApp, Maps, Kopyala | `OrderPanelContactCard.jsx` |
| V10.6 | **SSH alarm** — sekme etiketi 🟡/🔴 (N), banner | `OrderOperationPanel.jsx` |
| V10.7 | **Audit etiket temizliği** — `Tahsilat alındı`, vb. | `domainEventTypeLabelTr.js` |
| V10.8 | **Risk kartı V10** — görsel seviye | `OrderPanelRiskCard.jsx` |
| V10.9 | **Sevk KPI strip** — araç, ekip, saat, bölge, uygunluk | `OrderPanelShipmentKpiStrip.jsx` |
| V10.10 | **Mobil CSS** — 390px taşma önleme, yatay sekme scroll | `order-operation-panel.css` |

**V10 doğrulama (Playwright):** `client/scripts/verify-v10-stabilization.mjs`  
Rapor: `client/test-artifacts/v10-stabilization-report.json` — 7/7 kontrol geçti (2026-05-21).

---

## 4. Test & kalite durumu

### Kalite kapısı

```bash
cd backend && npm run build
cd client && npm run test && npm run lint && npm run build
```

| Kontrol | Son durum |
|---------|-----------|
| `client npm run build` | ✅ Geçiyor (~650ms) |
| V10 unit testleri | ✅ `orderV10.test.js`, `orderOperationPanel.test.js`, `orderAuditFeed.test.js` |
| V10 Playwright | ✅ 7/7 senaryo |
| Client foundation suite | ⚠️ 3 flaky test stabilizasyonu devam ediyor |
| Backend integration | ✅ 24 test dosyası (auth, RBAC, commerce E2E, sevk, …) |

### Flaky testler (V10 kaynaklı değil)

| Test | Kök neden | Düzeltme |
|------|-----------|----------|
| `mockStore.reset.test.js` | `executeRefreshOrdersFlow` iki fazlı timer; tek `runAllTimersAsync` yetmiyor | `_helpers/mockApiTimers.js` — iki aşamalı flush |
| `orderMutation.orchestration.test.js` (ilk test) | Aynı timer sorunu | Aynı helper |
| `wizardProductsCatalogFlow.test.js` | Katalog merge → fabric profili `fabricBrand` zorunlu | Test fixture’a `fabricBrand` eklendi |

> Bu 3 test V10 UI değişikliğinden bağımsızdır; mock orchestration / wizard validation kaynaklıdır.

---

## 5. Geliştirme ortamı

```text
1. Docker Desktop → PostgreSQL (backend/docker-compose.yml)
2. backend: prisma migrate deploy → db:seed → npm run dev  (:4000)
3. client:  VITE_API_BASE_URL=http://localhost:4000 → npm run dev (:5173)
```

**Pilot login:** `admin@mobilya.local` / `admin123`

**Cursor allowlist:** `.cursor/permissions.json` — güvenli npm/prisma komutları; `db:reset-demo` / `git push` engelli.

---

## 6. Bilinen sınırlar

- Davet e-postası / OAuth yok
- JWT stateless — refresh token yok
- Genel `updateOrder` API yok (durum / termin / ödeme ayrı endpoint)
- Çoklu mağaza (tenant) yok
- Build uyarısı: ana chunk ~582 kB (code-splitting önerilir)
- Mock modda `effectiveLineSeeds legacy fallback` stderr uyarıları (seed büyümesi)
- Telefonsuz siparişlerde iletişim butonları disabled (beklenen UX)

---

## 7. Devam edilmesi gereken işler

### Yüksek öncelik

- [ ] **Flaky test stabilizasyonunu bitir** — 3 testin yeşil olduğunu CI’da doğrula
- [ ] **Git checkpoint** — büyük untracked değişiklik setini anlamlı commit’lere böl
- [ ] **Pilot mağaza dry-run** — [PILOT_STORE_CHECKLIST.md](./PILOT_STORE_CHECKLIST.md) maddelerini işaretle

### Orta öncelik

- [ ] **Hybrid mock/API tutarlılığı** — client README’deki “yazma hâlâ mock” ifadesini güncel API kapsamıyla hizala
- [ ] **`executeRefreshOrdersFlow` orchestration** — `fetchDomainEventsAndTasks`’ı `executeRollbackOrdersState` gibi paralel çalıştır (timer + performans)
- [ ] **Katalog → wizard konfig otomatik doldurma** — `createWizardLineFromProduct` boş konfig bırakıyor; fabric zorunlu alanlar UX’te netleştirilmeli
- [ ] **Bundle optimizasyonu** — lazy chunk’lar, 500 kB uyarısı
- [ ] **Production hardening** — JWT secret rotation, pg_dump yedekleme prosedürü, HTTPS

### Düşük öncelik / backlog

- [ ] Refresh token / oturum yenileme
- [ ] Davet e-postası ile kullanıcı onboarding
- [ ] Çoklu mağaza (tenant) modeli
- [ ] WebSocket / gerçek zamanlı bildirim
- [ ] Mobil native / PWA manifest
- [ ] E2E suite genişletme (sevk operasyonu, wizard, tahsilat)
- [ ] `effectiveLineSeeds legacy fallback` seed verisini gerçek satır tohumlarıyla zenginleştir

---

## 8. Önemli dosya haritası

| Alan | Yol |
|------|-----|
| Sipariş detay paneli | `client/src/features/orders/OrderOperationPanel.jsx` |
| V10 modeller | `client/src/mappers/order/orderHealthBarModel.js`, `shipmentReadinessScore.js`, `orderTodayCommandModel.js` |
| V10 panel bileşenleri | `client/src/features/orders/panel/OrderPanel*.jsx` |
| Risk motoru | `client/src/mappers/risk/applyCompositeListItemRisk.js` |
| Audit feed | `client/src/features/orders/OperationAuditFeed.jsx` |
| Mock API | `client/src/services/mockApi.js` |
| Orchestration | `client/src/application/orderMutationOrchestration.js` |
| Backend routes | `backend/src/app.ts` |
| Prisma şema | `backend/prisma/schema.prisma` |
| V10 ekran doğrulama | `client/scripts/verify-v10-stabilization.mjs` |

---

## 9. Checkpoint referansları

- [FOUNDATION_V1.md](./FOUNDATION_V1.md) — Client mimari checkpoint
- [BACKEND_FOUNDATION_V1.md](./BACKEND_FOUNDATION_V1.md) — Backend READ/mutation checkpoint
- [FOUNDATION_V1_SMOKE_TEST.md](./FOUNDATION_V1_SMOKE_TEST.md) — Manuel smoke senaryoları
- [PILOT_STORE_CHECKLIST.md](./PILOT_STORE_CHECKLIST.md) — 1 günlük pilot hazırlığı
- [../README.md](../README.md) — Monorepo başlangıç sırası

---

*Bu belge canlı proje durumunu yansıtır; özellik eklenince veya pilot tamamlanınca güncellenmelidir.*
