# Teslim Durumu Motoru — Kurallar (P0-05)

Bu belge MOBILYA OS sipariş **fulfillment display status** türetim kurallarını özetler. Amaç: teslim statüsünün yalnızca operasyonel sevk akışıyla (`Planlandı → Yolda → Teslim Edildi`) güncellenmesi; **tarih geçmesi tek başına teslim anlamına gelmemeli**.

## Kaynak dosyalar

| Katman | Dosya | Rol |
|--------|-------|-----|
| Backend | `backend/src/lib/deriveOrderDisplayStatus.ts` | Depo satır durumlarından sipariş statüsü türetir |
| Backend | `backend/src/services/patchShipmentStatus.ts` | Sevk `DELIVERED` → `displayStatus: Teslim Edildi` |
| Backend | `backend/src/lib/autoShipmentReady.ts` | `Sevke Hazır` otomatik geçiş koşulları |
| Client (legacy) | `client/src/utils/orderTimeline.js` | Eski timeline görünümü — **yalnızca `status === Teslim Edildi`** |

## Fulfillment display status akışı

```
Bekleniyor
    ↓ (en az bir satır depo girişi başladı)
Kısmi Geldi  (tüm satırlar gelmediyse)
    ↓ (tüm satırlar ARRIVED)
Geldi
    ↓ (autoShipmentReady koşulları sağlandıysa)
Sevke Hazır
    ↓ (sevk DELIVERED event — patchShipmentStatus)
Teslim Edildi  ← terminal, geri dönüş yok
```

### Kurallar

1. **`Teslim Edildi` yalnızca terminal kayıt**  
   `deriveOrderDisplayStatusFromLines` stored status `Teslim Edildi` ise doğrudan döner; satır durumları bunu ezer.

2. **Tarih alanları statü üretmez**  
   `dueDate`, `shipmentDate`, `plannedShipDate` geçmiş olsa bile display status otomatik `Teslim Edildi` olmaz. Teslim yalnızca sevk operasyonu `DELIVERED` ile yazılır.

3. **`Sevke Hazır` vs `Geldi`**  
   Tüm satırlar depoda `ARRIVED` iken `orderQualifiesForAutoShipmentReady` (eksik parça yok, SSH blokajı yok, vb.) true ise `Sevke Hazır`; aksi halde `Geldi`.

4. **Sevk planlama tarihi = teslim tarihi (P0-04)**  
   Operasyon tek tarih kullanır: `plannedDate` / `plannedShipDate`. Ayrı `deliveryDate` alanı yok; sevk planı kaydedildiğinde teslim hedefi aynı gündür.

5. **Sevk operasyon statüleri (ayrı eksen)**  
   Shipment entity: `PLANNED` → `IN_TRANSIT` → `DELIVERED`. Sipariş `Teslim Edildi` yalnızca son adımda set edilir.

## Bilinen tutarsızlık riskleri

| Risk | Konum | Öneri |
|------|-------|-------|
| Legacy timeline `dueDate` fallback | `orderTimeline.js` delivered dateLabel | API modunda domain event timeline kullan; legacy path'te status zaten `Teslim Edildi` olmadan `done` olmaz |
| Mock modda manuel status patch | `mockApi.js` | Pilot'ta sevk DELIVERED akışını kullan |
| `READY_FOR_SHIPMENT` SSH | missing items | Sevke hazır sayılır, sevk blokajı kaldırılır |

## Doğrulama checklist

- [ ] Sevk planlandı, tarih geçti → status hâlâ `Sevke Hazır` / `Geldi` (teslim değil)
- [ ] Sevk `DELIVERED` işaretlendi → `Teslim Edildi`
- [ ] Kısmi depo girişi → `Kısmi Geldi`
- [ ] Açık SSH parça bekliyor → `Sevke Hazır` otomatik geçiş engellenir
