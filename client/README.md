# MOBILYA OS — Client

React + Vite tabanlı istemci. **Foundation v1 (Stable)** mimari checkpoint ve release notları:

- **[Client Foundation v1 — dokümantasyon ve checklist](../docs/FOUNDATION_V1.md)**
- **[Backend Foundation v1 — READ API checkpoint](../docs/BACKEND_FOUNDATION_V1.md)**
- **[Foundation v1 — manuel smoke & edge case senaryoları](../docs/FOUNDATION_V1_SMOKE_TEST.md)**
- **[Monorepo başlangıç sırası](../README.md#development-startup-order)**

Kalite kapısı (`client/` dizininde):

```bash
npm run test
npm run lint
npm run build
```

## Gerçek API modu (Backend Foundation v1)

Varsayılan olarak sipariş listesi **mock** store’dan gelir; üst çubukta **Mock veri** görünür.

Backend’e bağlanmak için:

1. Backend’i çalıştırın (`backend/`: Postgres + `npm run dev`, bkz. [Backend Foundation v1](../docs/BACKEND_FOUNDATION_V1.md)).
2. `client/.env` oluşturun: `copy .env.example .env`
3. `VITE_API_BASE_URL` satırının yorumunu kaldırın, örn. `VITE_API_BASE_URL=http://localhost:4000`
4. İstemciyi yeniden başlatın: `npm run dev`

Üst çubukta **Canlı API: http://localhost:4000** görünür; dashboard ve sipariş listesi `GET /v1/orders` yanıtını kullanır. Yazma (oluştur/güncelle) ve domain event / görev senkronu hâlâ mock’tur (READ slice).

Doğrulama: `curl http://localhost:4000/health` ve `curl http://localhost:4000/v1/orders`

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
