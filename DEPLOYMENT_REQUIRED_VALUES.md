# Deployment Required Values (User Provided)

Asagidaki degerler kullanici tarafindan saglanmalidir:

- production frontend domaini
  - ornek: https://app.example.com

- production backend domaini
  - ornek: https://api.example.com

- DATABASE_URL
  - bicim: postgresql://<user>:<password>@<host>:5432/<database>?schema=public

- AUTH_JWT_SECRET
  - bicim: guclu rastgele string (minimum 16 karakter, onerilen 32+)

- CORS_ORIGIN
  - bicim: https://<production-frontend-domain>

- (opsiyonel, kullanimda ise) OPENAI_API_KEY
- (opsiyonel, kullanimda ise) GEMINI_API_KEY
- (opsiyonel, kullanimda ise) WOO_STORE_URL
- (opsiyonel, kullanimda ise) WOO_CONSUMER_KEY
- (opsiyonel, kullanimda ise) WOO_CONSUMER_SECRET
