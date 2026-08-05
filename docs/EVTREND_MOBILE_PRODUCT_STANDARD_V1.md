# EVTREND / MOBILYA OS MOBILE PRODUCT STANDARD V1

Oncelik Notu:
Mobil tasarim dili kararlarinda [MOBILYA OS Mobile Design Language V2](./MOBILYA_OS_MOBILE_DESIGN_LANGUAGE_V2.md) esas alinir.
Kural cakismasi durumunda V2 tasarim dili dokumani onceliklidir.

Bu talimat bu projedeki onceki tum mobil gelistirme kurallarinin yerine gecer ve bundan sonraki tum mobil gelistirmelerde zorunlu standart olarak uygulanir.

## AMAC

EVTREND Mobile siradan bir ERP uygulamasi olmayacak.

Hedef:

- IsCep kadar guven veren
- Apple uygulamalari kadar sade
- Linear kadar temiz
- Notion kadar okunabilir
- Material 3 kadar tutarli
- Yillarca eskimeyecek Enterprise seviyesinde premium bir mobil platform olusturmak

==================================================
1. GELISTIRME SIRASI (ASLA DEGISMEYECEK)
==================================================

Hicbir ekran dogrudan kodlanmayacak.

Her ekran asagidaki sirayi eksiksiz takip edecek:

1. Problem Analizi
2. Success Criteria
3. Wireframe (Siyah-Beyaz)
4. Pixel Perfect Mockup
5. Design System
6. Component Development
7. Screen Composition
8. Backend Integration
9. Pixel QA
10. Regression Test
11. Release

Bu sira degistirilemez.

==================================================
2. PROBLEM ANALIZI
==================================================

Kod yazmadan once asagidaki sorular cevaplanacak:

- Kullanici neden bu ekrana geliyor?
- Ilk 3 saniyede neyi anlamali?
- En onemli aksiyon nedir?
- Ikinci aksiyon nedir?
- Bu ekranin basari kriteri nedir?
- Kullanici mumkun olan en az dokunusla hedefe ulasiyor mu?

==================================================
3. WIREFRAME
==================================================

Ilk tasarim yalnizca siyah-beyaz hazirlanacak.

- Renk kullanilmayacak.
- Gercek veri kullanilmayacak.
- Yalnizca yerlesim dogrulanacak.

==================================================
4. MOCKUP
==================================================

Wireframe onaylandiktan sonra Pixel Perfect Mockup hazirlanacak.

Referans tasarim dili:

- Apple Human Interface Guidelines
- IsCep
- Material 3
- Linear
- Notion

Mockup onaylanmadan tek satir kod yazilmayacak.

==================================================
5. DESIGN SYSTEM
==================================================

Design System projenin tek dogrusu olacaktir.

Hicbir ekran:

- Kendi rengini
- Kendi spacing degerini
- Kendi typography degerini
- Kendi radius degerini
- Kendi shadow degerini
- Kendi animation degerini

tanimlayamaz.

Butun degerler yalnizca Design Token'lardan gelir.

Yeni ihtiyac olusursa once Design System gelistirilir.
Daha sonra ekranlar kullanir.

==================================================
6. COMPONENT FIRST
==================================================

Sayfa gelistirilmez.
Component gelistirilir.
Page yalnizca component compose eder.

- Inline style yasaktir.
- Hardcoded CSS yasaktir.
- Hardcoded spacing yasaktir.
- Hardcoded renk yasaktir.
- Hardcoded radius yasaktir.
- Hardcoded shadow yasaktir.
- Hardcoded typography yasaktir.

==================================================
7. TASARIM FELSEFESI
==================================================

Dashboard mantigi terk edilmistir.

- Renkli KPI kutulari kullanilmayacaktir.
- ERP gorunumu olusturulmayacaktir.
- Uygulama kullaniciya rapor gostermeyecektir.

Uygulama kullaniciya su sorunun cevabini gosterecektir:

"Bugun ne yapmalisin?"

==================================================
8. HOME EKRANI PRENSIBI
==================================================

Her Home ekrani asagidaki sirayi kullanacaktir:

- Header
- Search
- Bugunku Oncelikler
- Gorev Listesi
- Hizli Islemler
- Son Hareketler

- Kart sayisi minimum tutulacaktir.
- Liste agirlikli tasarim kullanilacaktir.
- Bosluk kullanimi comert olacaktir.

==================================================
9. TASARIM DILI
==================================================

- Beyaz zemin
- Minimal renk
- Buyuk bosluk
- Ince ayirici cizgiler
- Buyuk touch target
- Az golge
- Yumusak radius
- Hafif animasyon
- Temiz tipografi

Kart yalnizca gercekten ihtiyac varsa kullanilacaktir.

==================================================
10. RENK KURALI
==================================================

- Yesil = Basari
- Mavi = Bilgi
- Turuncu = Uyari
- Kirmizi = Kritik
- Gri = Notr

Renk dekor amacli kullanilmayacaktir.

==================================================
11. BACKEND
==================================================

- Once UI tamamlanir.
- Sonra API baglanir.
- Backend nedeniyle UI tasarimi degistirilmez.
- Backend UI'ya uyum saglar.

==================================================
12. PIXEL QA
==================================================

Her ekran asagidaki kriterlere gore kontrol edilir:

- Spacing
- Typography
- Radius
- Shadow
- Touch Area
- Safe Area
- Animation
- Apple HIG uyumu
- Material 3 uyumu
- IsCep sadeligi

==================================================
13. REGRESSION
==================================================

Her ekran tamamlandiktan sonra asagidaki kontroller zorunludur:

- Visual Regression
- Screenshot Compare
- Component Regression

==================================================
14. UX SKORU
==================================================

Her ekran 10 uzerinden puanlanacaktir.

9 puanin altindaki ekran kabul edilmeyecektir.
Gerekirse bastan tasarlanacaktir.

==================================================
15. KALITE PRENSIBI
==================================================

- Hiz icin kalite dusurulmeyecek.
- Eski ekran yamalanmayacak.
- Gerekiyorsa sifirdan yapilacak.
- Kucuk duzeltmeler yerine dogru mimari tercih edilecek.
- Kisa vadeli cozum yerine uzun yillar surdurulebilir yapi kurulacaktir.

==================================================
16. NIHAI HEDEF
==================================================

EVTREND Mobile bir ERP uygulamasi gibi gorunmeyecektir.

- Bir banka uygulamasi kadar guven veren
- Apple uygulamalari kadar premium
- Notion kadar okunabilir
- Linear kadar temiz
- Kurumsal kullanicilarin yillarca keyifle kullanacagi Enterprise seviyesinde bir mobil platform

Bu dokuman bundan sonraki tum mobil gelistirmeler icin degismez ana standarttir ve istisnasiz uygulanir.
