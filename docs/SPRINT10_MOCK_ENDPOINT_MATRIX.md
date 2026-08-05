# Sprint 10 - Mock Endpoint Matrix

Bu dosya, mock fallback kullanan kritik endpointleri "Gercek API var mi" ve "Eksik alanlar" perspektifinde listeler.

## Core Order Flow (`client/src/services/ordersClient.js`)

| Islem | API Endpoint | Gercek API | Mock Fallback | Eksik Alanlar / Not |
|---|---|---|---|---|
| Siparis listesi | `GET /v1/orders` | Var | Var | Bazli ekranlarda musteri seviyesinde ayrik API yok |
| Siparis olustur | `POST /v1/orders` | Var | Var | Client tarafinda legacy alan mapleri hala tasiniyor |
| Siparis durum guncelle | `PATCH /v1/orders/:id/status` | Var | Var | Policy override metadata standardizasyonu gerekli |
| Domain event listesi | `GET /v1/domain-events` | Var | Var | Event tipi kapsami genisletilmeli |
| Siparis domain event | `GET /v1/orders/:id/domain-events` | Var | Var | Es tip route `/events` geriye donuk destekte |
| Domain event ekle | `POST /v1/domain-events` | Var (whitelist) | Var | Whitelist disi eventler reddediliyor |
| Tahsilat ekle | `POST /v1/orders/:id/payments` | Var | Var | Onay akisi role bagimli, audit alanlari zenginlestirilmeli |
| Tahsilat onayla | `POST /v1/orders/:id/payments/:paymentId/approve` | Var | Var | Approval reason standardi |
| Tahsilat reddet | `POST /v1/orders/:id/payments/:paymentId/reject` | Var | Var | Rejection reason standardi |
| Termin patch | `PATCH /v1/orders/:id/termin` | Var | Var | Deadline rule reasons sözlesmesi |
| Missing item list | `GET /v1/orders/:id/missing-items` | Var | Var | Severity/priority normalize |
| Missing item create | `POST /v1/orders/:id/missing-items` | Var | Var | Supplier link alanlari parity kontrolu |
| Missing item status | `PATCH /v1/missing-items/:id/status` | Var | Var | Resolution metadata zenginlestirme |
| Ready for shipment | `POST /v1/orders/:orderId/missing-items/:missingItemId/ready-for-shipment` | Var | Var | Note/actor parity |
| Shipment list (order) | `GET /v1/orders/:id/shipments` | Var | Var | Shipment issue metadata |
| Shipment create | `POST /v1/orders/:id/shipments` | Var | Var | Lines selection parity ve validation |
| Shipment status | `PATCH /v1/shipments/:id/status` | Var | Var | Transitional policy matrix |
| Shipment queue | `GET /v1/shipments` | Var | Var (projection fallback) | Role bazli 403 fallback kullaniliyor |
| Order lines | `GET /v1/orders/:id/order-lines` | Var | Var | Configuration wire tutarliligi |
| Shipment plan lines | `GET /v1/orders/:id/shipment-plan-lines` | Var | Var | Readiness field parity |

## Shipment Planning (`client/src/services/shipmentPlansClient.js`)

| Islem | API Endpoint | Gercek API | Mock Fallback | Eksik Alanlar / Not |
|---|---|---|---|---|
| Plan liste | `GET /v1/shipment-plans` | Var | Var | 403 durumunda bos liste fallback var |
| Plan upsert | `POST/PUT shipment plan` | Var | Var | Versioning/etag yok |
| Plan batch upsert | Batch endpoint | Var | Var | Atomicity ve conflict semantigi netlestirilmeli |
| Group create | `POST /v1/shipment-groups` | Var | Var | Estimated saving parity |

## Supply & Warehouse

| Dosya | API Durumu | Mock Durumu | Not |
|---|---|---|---|
| `incomingGoodsClient.js` | Var | Var | Incoming list/create + pending line akisi |
| `suppliersClient.js` | Var | Var | Supplier CRUD kismi parity |
| `warehouseEntriesClient.js` | Var | Var | Read list parity, write kapsami kontrol edilmeli |
| `supplyOrderClient.js` | Var | Var | Supply sent/revert akisi offline policy ile hizalanmali |

## Product / Catalog

| Dosya | API Durumu | Mock Durumu | Not |
|---|---|---|---|
| `productsClient.js` | Var | Var | Product detail/list parity |
| `productMasterClient.js` | Var | Var | Health/publish alanlarinin parity dogrulamasi gerekli |

## Executive / AI / Analytics (Genis Mock Kapsami)

Asagidaki domain clientlarinin buyuk bolumu API varsa onu, yoksa `mock*Api.js` katmanini kullaniyor:
- `actionCenterClient.js`, `actionOrchestratorClient.js`
- `operationsAdvisorClient.js`, `operationsAgentsClient.js`, `operationCaseClient.js`
- `ceo*Client.js`, `forecastEngineClient.js`, `goalEngineClient.js`, `optimization*Client.js`
- `business*Client.js`, `learning*Client.js`, `predictionClient.js`

Bu katmanda hedef: tum clientlarin repository kontratina alinmasi ve mock fallbacklerin feature-flag arkasina alinmasi.

## Sprint 10 Sonucu

- Core operasyon endpointleri icin API mevcudiyeti var.
- Mock fallback halen aktif, ancak canli pipeline oncelikli.
- Eksik alanlar agirlikla parity (metadata/version/conflict/audit) alanlarinda.
