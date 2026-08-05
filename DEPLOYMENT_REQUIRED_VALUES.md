# Deployment Required Values (User Provided)

Asagidaki degerler kullanici tarafindan saglanmalidir:

- production frontend domaini
  - deger: https://mobilya-os-mobile.vercel.app

- production backend domaini
  - ornek: https://api.example.com

- NODE_ENV
  - deger: production

- DATABASE_URL
  - deger: Neon'daki yeni production connection string
  - bicim: postgresql://<user>:<password>@<host>:5432/<database>?schema=public

- JWT_SECRET
  - deger: Render "Generate" ile olusturulmus guclu rastgele secret
  - bicim: minimum 32 karakter onerilir

- CORS_ALLOWED_ORIGINS
  - deger: https://mobilya-os-mobile.vercel.app
  - bicim: virgulle ayrilmis origin listesi (tek origin ise tek URL)

- (opsiyonel, kullanimda ise) OPENAI_API_KEY
- (opsiyonel, kullanimda ise) GEMINI_API_KEY
- (opsiyonel, kullanimda ise) WOO_STORE_URL
- (opsiyonel, kullanimda ise) WOO_CONSUMER_KEY
- (opsiyonel, kullanimda ise) WOO_CONSUMER_SECRET
