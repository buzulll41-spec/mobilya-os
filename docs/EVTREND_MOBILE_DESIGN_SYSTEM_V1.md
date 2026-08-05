# EVTREND Mobile Design System V1 (Kilitli)

Oncelik Notu:
Bu dokuman, [EVTREND / MOBILYA OS MOBILE PRODUCT STANDARD V1](./EVTREND_MOBILE_PRODUCT_STANDARD_V1.md) ile birlikte kullanilir.
Kural veya surec cakismasi durumunda MOBILE PRODUCT STANDARD V1 esas alinir.

Bu dokuman, EVTREND mobil urununun resmi tasarim standardidir.
Bu standart bugunden sonra yapilacak tum mobil ekranlar icin zorunludur.

Kapsam:
- Login
- Ana Sayfa
- Siparis
- Musteri
- Tahsilat
- Servis
- CEO
- Gelecekte eklenecek tum mobil moduller

Bu dokumanin amaci yeni ekran tanimlamak degildir.
Bu dokumanin amaci, tum ekranlarin ayni urunun parcasi gibi gorunmesini garanti eden tek bir tasarim dili tanimlamaktir.

## 1. Tasarim Felsefesi

EVTREND klasik ERP degildir.
EVTREND, mobil oncelikli profesyonel operasyon uygulamasidir.

Her ekran su soruya cevap vermek zorundadir:
Kullaniciya simdi ne yapmasi gerektigini soyluyor mu?

Kural:
- Bilgi ikinci planda kalir.
- Aksiyon birinci planda kalir.

## 2. Sayfa Hiyerarsisi

Her mobil ekran asagidaki sirayi aynen kullanir:
1. Baslik
2. AI Karti
3. Ana Icerik
4. Destek Bilgileri
5. Sabit Alt Aksiyonlar

Sira degistirilemez.

## 3. Bosluk Sistemi

Tum mobil ekranlarda zorunlu spacing degerleri:
- Kenar boslugu: 20 px
- Kart arasi: 16 px
- Kart ici: 16 px
- Bolum arasi: 24 px

Kural:
- Hicbir ekran sikisik gorunemez.
- Bu degerler layout temeli olarak korunur.

## 4. Kart Sistemi

Tum moduller tek tip kart dilini kullanir:
- Yuvarlak kose
- Hafif golge
- Ince border

Kural:
- Her modulde ayni kart karakteri korunur.
- Module ozel farkli kart stili uretilmez.

## 5. Renk Sistemi

Duruma gore kullanilacak sabit renk anlami:
- Yesil: Basarili
- Turuncu: Bekliyor
- Kirmizi: Kritik
- Mavi: Standart islem
- Mor: Bilgilendirme

Kural:
- Renk anlami ekranlar arasinda degistirilemez.

## 6. Buton Hiyerarsisi

Tum ekranlarda ayni buton hiyerarsisi kullanilir:
- Birincil: Dolu
- Ikincil: Cerceveli
- Ucuncul: Text Button

Kural:
- Ayni aksiyon seviyesi ayni buton tipi ile gosterilir.

## 7. AI Karti Standardi

Her ekranda AI alani yalnizca en onemli tek oneriyi gosterir.

Kural:
- AI ayni anda birden fazla kritik aksiyon onerisi listelemez.
- Her AI onerisi tek bir net aksiyonla biter.

## 8. Sabit Alt Aksiyonlar

Tum mobil ekranlarda sabit alt aksiyon alani zorunludur.

Kurallar:
- Dokunma alani minimum 44 px olur.
- Birincil islem solda konumlanir.
- Ikincil islem sagda konumlanir.

## 9. Ikon Standardi

Tek ikon ailesi kullanilir.

Kural:
- Karisik ikon dili kullanilamaz.

## 10. Tipografi Skalasi

Tum mobil ekranlarda tipografi degerleri:
- Baslik: 24
- Kart Basligi: 18
- Normal Metin: 16
- Aciklama: 14
- Not: 12

Kural:
- Ekranlar arasi tipografi skalasi degistirilemez.

## 11. Liste Ekranlari

Mobil liste ekranlari icin kural:
- Desktop tablo kullanimi yasak.
- Kart sistemi zorunlu.

## 12. Form Ekranlari

Mobil form ekranlari icin kural:
- Tek kolon zorunlu.
- Uzun form tek parca sunulamaz.
- Wizard veya kart tabanli parcalama tercih edilir.

## 13. Bottom Sheet

Islem Yap menulerinin tamami tek bir bottom-sheet desenini kullanir.

Kural:
- Tum aksiyon menuleri ayni davranis ve ayni gorunume sahip olur.

## 14. Animasyon Prensibi

Animasyon dili:
- Hafif
- Yumusak
- Premium
- Abartisiz

Kural:
- Animasyon odagi dikkat dagitmak degil, akis netligini artirmaktir.

## 15. En Onemli Kural

Bir ekran gelistirilirken onceki ekranlardan farkli bir urun gibi gorunemez.

Tum ekranlar su urun karakterini korur:
- Login
- Ana Sayfa
- Siparis
- Musteri
- Tahsilat
- Servis
- CEO

Hepsi ayni urunun parcalari gibi gorunmek zorundadir.

## Uygulama Karari

Bu standart, EVTREND Mobile Design System V1 olarak kilitlenmistir.
Bugunden sonra gelistirilecek tum mobil ekranlar bu dokumani referans alir.

Uyumsuz tasarimlar, V1 standardina geri cekilmeden tamamlanmis kabul edilmez.

## UI Freeze Protokolu

Bugunden itibaren tasarim iterasyonu durdurulmustur.
Product Owner onayi alan her ekran UI Freeze durumuna gecer.

UI Freeze durumundaki bir ekranda asagidaki degisiklikler yapilamaz:
- Yeni layout uretimi
- Yeni component arayisi veya ekran icinde yeni desen tanimlama
- Spacing sisteminin yeniden tasarlanmasi
- Tipografi seviyelerinin degistirilmesi
- Renk sisteminin degistirilmesi

UI Freeze sonrasi degisiklik sadece su 3 durumda yapilabilir:
1. Kritik kullanilabilirlik problemi
2. Teknik hata
3. Yeni is gereksinimi

Design System ve Component Library gelistirmeleri, onayli ekranlari bozmadan ve mevcut ekran kontratlarini koruyarak yapilir.

Oncelik yeni tasarim uretmek degil, kalan modulleri ayni standartla tamamlamaktir.
Home ekrani referans ekrandir; bundan sonraki tum moduller Home ile ayni tasarim dili, ayni hiyerarsi ve ayni component karakteriyle bitirilir.
