# MOBILYA OS — Tahsilat Mimarisi (Kilit Karar)

**Durum:** Kilitli · **Tarih:** 2026-06-17

Bu belge gelecekteki geliştirme ve refaktör taleplerinde bağlayıcıdır.

---

## İki ayrı ekran — birleştirilmez

| Ekran | Konum | Amaç |
|-------|--------|------|
| **Sipariş > Ödemeler sekmesi** | Sipariş detay paneli | Sipariş bazlı tahsilat, hızlı ödeme girişi, bakiye görüntüleme |
| **Tahsilat Merkezi** | `CollectionPage` / `CollectionCenterPanel` | Tüm açık tahsilat dosyaları, risk yönetimi, günlük tahsilat operasyonu |

---

## Yasaklar

1. İki ekranı tek ekranda birleştirmek
2. Üçüncü bir “yeni tahsilat modülü” oluşturmak
3. Tahsilat Merkezi'ni sipariş detayına taşımak veya tam tersi

---

## İzin verilen geliştirmeler (küçük UX)

- Tahsilat Merkezi'nde **Aç** butonu (siparişe git)
- Daha iyi filtreler
- Daha iyi görünüm / layout iyileştirmeleri
- Mevcut bileşenlerde (`CollectionCenterPanel`, `OrderPanelPaymentsTable`) odaklı UX düzenlemeleri

---

## İlgili kod

- Sipariş ödemeleri: `client/src/features/orders/panel/OrderPanelPaymentsTable.jsx`
- Tahsilat merkezi: `client/src/pages/CollectionPage.jsx`, `client/src/features/collection/CollectionCenterPanel.jsx`
