# EVTREND / MOBILYA OS ENTERPRISE PRODUCT REBUILD V1

Bu gorev yeni bir ekran gelistirme gorevi degildir.
Bu gorev MOBILYA OS'un bundan sonraki butun UI altyapisini kurma gorevidir.

Amac:
- Yalnizca calisan ekranlar degil
- Yillarca gelistirilebilir
- Olceklenebilir
- Premium kalite hissi veren Enterprise seviyesinde product platform kurmak

## Temel Karar

Artik ekran gelistirmiyoruz.
Artik product platform gelistiriyoruz.

Home, Siparis, Tahsilat, Sevkiyat ve diger ekranlar bagimsiz gelistirilmeyecek.
Once platform kurulacak.
Sonra ekranlar platform uzerine insa edilecek.

## Zorunlu Cekirdek Kurallar

1. Project audit tamamlanmadan migration baslamaz.
2. Design token sistemi tek kaynak olur.
3. Component-first mimari zorunludur.
4. Showcase disinda yeni component dogrudan ekrana alinmaz.
5. Screen contract disi yerel tasarim karari alinmaz.
6. Home V2 referans dil olarak once tamamlanir.
7. Tum ekranlar ayni page architecture iskeletini kullanir.
8. Performance ve accessibility budget zorunludur.
9. Visual regression gate olmadan ekran tamamlanmis sayilmaz.
10. Migration modul bazli ve asamali ilerler; eski ekran birebir esitlik olmadan kaldirilmaz.

## Gecis Sirasi

1. Home
2. Siparisler
3. Tahsilat
4. Sevkiyat
5. Servis
6. Musteriler
7. SSH
8. Depo
9. Raporlar
10. Ayarlar

## Cikis Kriteri

Yeni ekran gelistirmesine baslamadan once su raporlar onaylanmis olmalidir:
1. Proje saglik puani
2. Teknik borc puani
3. Design System tamamlama yuzdesi
4. Component Library tamamlama yuzdesi
5. Duplicate kod analizi
6. CSS sadelestirme raporu
7. Migration plani
8. Ilk yeniden yazilacak ekran onerisi
9. Tahmini kalan calisma plani
10. Kritik riskler ve cozum onerileri

Bu raporlar icin baslangic calismasi:
- docs/ENTERPRISE_PRODUCT_REBUILD_V1_AUDIT_REPORT.md

Home V2 implementation-oncesi kilit dokumanlar:
- docs/HOME_V2_SCREEN_CONTRACT.md
- docs/HOME_V2_PRE_IMPLEMENTATION_GATE.md

Mobil tasarim dili kilit dokumani:
- docs/MOBILYA_OS_MOBILE_DESIGN_LANGUAGE_V2.md
