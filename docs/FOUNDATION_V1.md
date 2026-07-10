# MOBILYA OS — Foundation v1 (Stable Checkpoint)

**Etiket:** Foundation v1 Stable  
**Kapsam:** `client/` içindeki wire contract’lar, application katmanı, projection, mapper’lar, mock aggregate’ler, domain event / operasyonel görev motoru, debug paneli ve foundation testleri.  
**Bu doküman:** Davranış tanımı değildir; mimari checkpoint ve release notudur.

---

## 1. Mimari özet

### Contracts (`client/src/contracts/v1/`)

- **Wire tipleri:** `SalesOrderListItemDto`, domain event (`DomainEventDto`, `DOMAIN_EVENT_TYPE`), görev (`TaskDto`, `TASK_STATUS`, `TASK_PRIORITY`), para (`Money`), enum’lar (`RiskSeverity`, lifecycle, sevk / ödeme).
- Amaç: UI ve mock API arasında **ortak dil**; JSDoc typedef ile TypeScript’siz sözleşme.

### Application layer (`client/src/application/`)

- **`projectSalesOrderListItemDto.js`:** IO’suz **saf liste projection** (legacy + read model → DTO).
- **`orderSnapshotSync.js`:** `getDomainEvents` + `getTasks` paralel snapshot.
- **`orderMutationOrchestration.js`:** `executeRefreshOrdersFlow`, `executeRollbackOrdersState`, `executeCreateOrderFlow`, `executeUpdateOrderFlow` — mock client çağrıları + domain append + snapshot senkronu.

### Projection pipeline

1. **Legacy → wire:** `legacyOrderToSalesOrderListItemDto` (saf zincirin parçası).
2. **Sevkiyat özeti:** `enrichSalesOrderListItemWithShipmentSummary` (mock sevkiyat + satır tohumları).
3. **Ödeme özeti:** `enrichSalesOrderListItemWithPaymentSummary` (mock ödeme ledger veya legacy).
4. **Composite risk:** `applyCompositeListItemRisk` / `getCompositeListItemRiskContext`.

**IO giriş noktası:** `services/orderListItemProjection.js` — store’dan veriyi okur, `projectSalesOrderListItemDtoFromReadModels` çağırır.

### Mapper layer (`client/src/mappers/`)

- **Satır VM:** `mapListItemToRowVM`, sevk / tahsilat satır VM’leri.
- **Legacy köprü:** `listItemDtoToLegacyOrder`.
- **Timeline / görev UI:** `mapDomainEventsToTimelineSteps`, `mapTaskDtoToDrawerRow`, etiket helper’ları.
- **Risk:** `applyCompositeListItemRisk.js` (composite kurallar + debug açıklaması).

### Shipment aggregate (mock)

- `mockShipmentStore.js` + `enrichSalesOrderListItem.js` → DTO’da `qty*`, `partiallyShipped`, açık sevk sayısı, sonraki plan tarihi.

### Payment aggregate (mock)

- `mockPaymentStore.js` + `enrichSalesOrderListItemWithPaymentSummary.js` → `amountPaid` / `amountDue`, `paymentProgress`, `hasOverdueBalance`, `lastPaymentAt`.

### Risk projection

- **Liste riski:** Termin + kısmi sevk sinyali + `Eksik Var` durumu → `currentRiskSeverity`, `riskSignalOverduePartialShipment`.
- **Debug açıklaması:** `explainCompositeListItemRiskForDebug`.

### Domain events

- **Store:** `mockDomainEventStore.js` — idempotent `appendDomainEvent` (aynı `id` veya aynı `type + aggregateId + correlationId`).
- **Fixture + append:** `OrdersProvider` / orchestration lifecycle ve `operationalTaskSync` stabil `task.*` id’leri.

### Operational tasks

- **Motor:** `operationalTaskSync.js` — `rebuildOperationalTasksFromDtos` (kural görevleri + manuel koruma + stabil `task.created` / `task.completed`).
- **Store:** `mockTaskStore.js` — `replaceAllTasks` eşitlikte no-op.
- **Mock API:** `getOrders` / `syncAllOperationalTasks` ile rebuild tetiklenir.

### Debug panel (`client/src/debug/`)

- **`OperationalDebugPanel.jsx`:** Yalnızca `import.meta.env.DEV`; drawer içinde collapsible operasyonel debug.
- **`operationalDebugModel.js`:** Pipeline etiketleri, replay sıralama, görev gerekçe metinleri.

### Tests (`client/tests/foundation/`)

- Projection determinism, composite risk, task rebuild idempotency, domain append idempotency, timeline replay sırası, order mutation orchestration, mock reset determinism.
- Helper: `_helpers/mockApiTimers.js` (mockApi `fakeLatency` için Vitest fake timers).

---

## 2. Data flow (metin diyagramı)

```
[seedOrders / memoryOrders mockApi]
        │
        ▼
[getOrders] ──► projectLegacyOrderToListItemDto (IO: shipment + payment store okuma)
        │                    │
        │                    ► projectSalesOrderListItemDtoFromReadModels (saf: wire + enrich + risk)
        │
        ├──► rebuildOperationalTasksFromDtos ──► mockTaskStore + appendDomainEvent (task.*)
        │
        ▼
[SalesOrderListItemDto[]] ──► OrdersProvider state (salesOrderListItemDtos)
        │
        ├──► useMemo ──► orderListRows, shipmentRowVMs, collectionRowVMs, orders (legacy)
        │
[fetchDomainEventsAndTasks / orchestration]
        │
        ▼
domainEvents[], operationalTasks[] ──► OrdersProvider
        │
        ├──► useOrderWorkspace (orders + VM’ler) ──► Dashboard / sevk / tahsilat türevleri
        ├──► OrderDetailDrawer ──► timeline + görevler + (dev) OperationalDebugPanel
        └──► tablolar / diğer sayfalar
```

---

## 3. Source of truth vs derived

| Katman | Rol |
|--------|-----|
| **Source of truth (mock)** | `memoryOrders`, `mockShipmentStore`, `mockPaymentStore`, `mockDomainEventStore`, `mockTaskStore` |
| **Derived (projection)** | `SalesOrderListItemDto` içi sevkiyat / ödeme / risk alanları; `projectSalesOrderListItemDtoFromReadModels` çıktısı |
| **Derived (UI)** | `orderListRows`, `shipmentRowVMs`, `collectionRowVMs`, `orders` (Provider `useMemo`); `useOrderWorkspace` çıktıları; timeline adımları |
| **UI cache** | `OrdersProvider` içindeki DTO + event + task snapshot’ları (sunucu/mock ile senkron) |

---

## 4. Kalite kapısı — komutlar

Çalışma dizini: `client/`

```bash
npm run test
npm run lint
npm run build
```

- **`test`:** Vitest, `tests/foundation/**/*.test.js` (Vite config içinde tanımlı).
- **`lint`:** ESLint.
- **`build`:** Üretim bundle (davranış değişikliği yok; checkpoint doğrulaması).

---

## 5. Release checklist (Foundation v1)

- [ ] `npm run test` — tüm foundation testleri geçiyor.
- [ ] `npm run lint` — uyarı / hata yok.
- [ ] `npm run build` — başarılı.
- [ ] Bu dokümandaki mimari özet güncel (önemli dosya taşınmadıysa onay).
- [ ] Ürün davranışı: sipariş listesi, drawer, timeline, görev listesi, dev-only debug — manuel duman testi (isteğe bağlı).
- [ ] Versiyon / etiket: repo veya dağıtımda “Foundation v1” notu (ör. tag, CHANGELOG satırı).

---

## 6. Bilinen sınırlar ve sonraki adımlar

**Sınırlar**

- Tüm backend mock; gerçek API / auth / çok kiracılılık yok.
- `OrdersProvider` hâlâ React state orkestrasyonu taşır; application katmanı akışları ayırdı, tam “hexagonal” değil.
- Debug panel production bundle’da import edilebilir (dev’de gizli); ileride dynamic import ile küçültülebilir.
- Testler `fileParallelism: false` — global mock store paylaşımı.

**Sonraki adımlar (öneri, sıra esnek)**

- Mutasyon + snapshot tek “command” modülünde toplama (Provider daha ince).
- Task motoru için saf kural fonksiyonu + ayrı persist adapter (test edilebilirlik).
- Gerçek backend geldiğinde: contract’ları OpenAPI / Zod ile hizalama; event store idempotency kurallarını sunucuda tekrarlama.

---

## 7. Resmileştirme

Bu checkpoint onaylandığında proje bu haliyle **“Foundation v1 Stable”** kabul edilir: davranış kilidi, dokümantasyon ve kalite komutları üzerinden tanımlanır. Sonraki özellikler **Foundation v2+** veya ayrı epic olarak işlenmelidir.

---

*Son güncelleme: Foundation v1 release dokümantasyonu oluşturulduğu tarih.*
