# MOBILYA OS — Foundation v1 Manuel Smoke & Edge Case Senaryoları

**Amaç:** Backend veya yeni modüle geçmeden önce Foundation v1’in tarayıcıda tutarlı ve güvenli olduğunu elle doğrulamak.  
**Ortam:** `npm run dev` (geliştirme). Demo tarihi: uygulama `DEMO_TODAY` sabitine bağlıdır.  
**Kalite kapısı (otomatik):** `npm run test`, `npm run lint`, `npm run build` — release öncesi mutlaka yeşil olmalıdır.

Her bölümde: **Adımlar** → **Beklenen** → **Hata notu** (boş bırakın veya sorun yazın).

---

## 1. Dashboard kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Uygulamayı aç; varsayılan sayfa Dashboard. | KPI kartları ve bölümler yüklenir; kritik hata banner’ı yok. | |
| Sayfa üstündeki global arama kutusunu boş bırak. | Dashboard metrikleri seed veriyle anlamlı görünür (0 sipariş değil). | |
| Sidebar’dan Dashboard’a tekrar tıkla (veya yenile). | Aynı içerik; flash of empty state yok. | |

---

## 2. Sipariş listesi kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Sidebar → **Siparişler**. | Tablo satırları listelenir; yükleme sonrası boş liste yok (seed). | |
| Bir satıra tıkla (detay açılıyorsa) veya mevcut UX’e göre drawer tetikle. | Sipariş kimliği ile drawer açılır. | |

---

## 3. Sipariş detay drawer kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Bir siparişi açıp drawer’ı kapat (X veya backdrop / Escape). | Drawer kapanır; scroll kilitleri kalkar. | |
| Müşteri, ürün, ödeme özeti, operasyon durumu, teslimat bölümleri görünür. | Veri seed ile uyumlu; tutarsız alan yok. | |

---

## 4. Shipment / kısmi sevk kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| **Sevk** sayfasına git. | Sevk kuyruğu veya ilgili tablo yüklenir. | |
| Kısmi sevk senaryosu olan seed siparişi (varsa) drawer veya listede kontrol et. | `partiallyShipped` ile uyumlu UI (liste VM / drawer metni). | |

---

## 5. Payment / tahsilat kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| **Tahsilat** sayfasına git. | Tahsilat satırları listelenir. | |
| Drawer’da kalan bakiye ve tahsilat oranı metinleri tutarlı. | Toplam − tahsil ile uyumlu görünür. | |

---

## 6. Risk rozetleri kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Risk vurgulu satırlar (dashboard / liste) görünür mü kontrol et. | “Eksik Var” veya gecikmiş termin ile uyumlu vurgu. | |

---

## 7. Operational Tasks kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Drawer’da **Operasyonel görevler** bölümünü aç. | Görevler öncelik sırasıyla listelenir veya boş durum metni görünür. | |
| Görev yoksa | “Bu sipariş için açık operasyonel görev yok.” metni. | |

---

## 8. Timeline / DomainEvent kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Drawer’da **Operasyon** zaman çizelgesi. | Domain event’ler varsa kronolojik adımlar; risk / görev olaylarında farklı nokta rengi (varsa). | |
| Alt kısımda “operasyon devam ediyor” benzeri güncel adım (teslim edilmemiş siparişlerde). | Tutarlı metin. | |

---

## 9. Debug panel kontrolü (**development**)

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| `npm run dev` ile çalıştır; drawer en alta kaydır. | **Operational Debug** `<details>` görünür. | |
| `npm run build` + `npm run preview` (veya prod build) ile aç. | Debug bölümü **görünmemeli** (`import.meta.env.DEV === false`). | |

---

## 10. Arama / filtre kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Global aramada bilinen bir müşteri veya sipariş no yaz. | Liste / dashboard türevleri filtrelenir. | |
| Aramayı temizle. | Tüm satırlar geri gelir. | |

---

## 11. Create order kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Yeni sipariş oluştur akışını aç (modal / form). | Zorunlu alanlar doldurulabilir. | |
| Kaydet. | Liste başına yeni sipariş; hata banner’ı yok. | |
| Drawer ile yeni siparişi doğrula. | Kimlik ve tarih demo günü ile uyumlu. | |

---

## 12. Update status kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Drawer’da durum seçiciyi değiştir (ör. Üretimde → Hazır). | Kayıt sonrası rozet ve liste güncellenir. | |
| Timeline’da lifecycle değişikliği yansıması (event üretimi). | Uygun etiketli yeni adım (mock). | |

---

## 13. Reset / refresh davranışı kontrolü

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Uygulamada “yenile / refresh orders” tetikleyicisi varsa kullan; yoksa sayfa F5. | Seed’e dönüş veya tutarlı yeniden yükleme; sürekli hata yok. | |

---

## 14. Edge case senaryoları

### 14.1 Kısmi sevk + gecikmiş termin → HIGH risk (composite)

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| `getCompositeListItemRiskContext` kuralı: termin `DEMO_TODAY`’den önce, `partiallyShipped === true`, status “Eksik Var” değilse bile kombinasyon HIGH üretir. | Seed’de bu kombinasyonu sağlayan sipariş varsa liste/drawer’da HIGH risk; **dev** debug panelinde “termin + kısmi sevk” açıklaması. | |
| Bu kombinasyonu sağlayan seed yoksa | Otomatik testte (`risk.projection.test.js`) doğrulanır; manuelde **N/A** yazın. | |

### 14.2 Ödeme PENDING — bakiyeye dahil edilmemeli

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Kod: `ledgerPostedTotal` yalnızca **POSTED** işlemleri toplar; PENDING dahil edilmez. | Mock’ta yalnızca PENDING CAPTURE olan siparişte `amountPaid` / kalan, PENDING tutarıyla şişmemeli. | |
| Manuel doğrulama zorsa | `npm run test` içindeki projection / payment zinciri ve dokümantasyonla hizalı kabul. | |

### 14.3 Aynı refresh tekrarında duplicate task oluşmamalı

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Aynı oturumda refresh’i 2–3 kez tetikle. | Aynı `dedupeKey` ile görev satırı çoğalmaz; sayılar stabil. | |
| Otomatik doğrulama | `operationalTask.rebuild.test.js` | |

### 14.4 Aynı refresh tekrarında duplicate domain event oluşmamalı

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Refresh sonrası event listesi (debug veya timeline yoğunluğu) gözle kontrol. | Aynı stabil `task-created-*` / `task-done-*` id’leri için tekrarlayan satır yok. | |
| Otomatik doğrulama | `domainEvent.append.test.js` | |

### 14.5 Event yoksa legacy timeline fallback

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| `mapDomainEventsToTimelineSteps`: aggregate için domain event yoksa `buildOrderTimeline(order)` kullanılır. | İzole test ortamı dışında: seed’de event’i olmayan yeni sipariş oluşturup drawer timeline’ına bak. | Legacy adımlar (kapora, üretim vb.) görünür. | |

### 14.6 Task yoksa drawer boş durum

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Görev üretilmeyen bir sipariş (ör. teslim edilmiş, kural tetiklenmiyor) aç. | “Bu sipariş için açık operasyonel görev yok.” | |

### 14.7 Debug panel yalnızca development

| Adımlar | Beklenen | Hata notu |
|--------|----------|-----------|
| Dev’de drawer’da **Operational Debug** görünür. | Production build’de görünmez. | |

---

## 15. Go / No-Go kararı

| Karar | Tanım |
|--------|--------|
| **Geçer** | Tüm kritik bölümler (1–13) ve ilgili edge case’ler (14) beklenenle uyumlu; otomatik `test` / `lint` / `build` yeşil. |
| **Koşullu geçer** | Küçük UI metin farkları veya N/A edge case’ler; kayıtlı not ile bir sonraki sprinte borç. |
| **Kalır** | Veri kaybı, çift event/görev, prod’da debug sızıntısı, veya otomatik kapı kırmızı. |

**Karar:** ☐ Geçer ☐ Koşullu geçer ☐ Kalır  

**İsim / tarih:** _______________________

---

## İlişkili dokümanlar

- [Foundation v1 — mimari checkpoint](./FOUNDATION_V1.md)
