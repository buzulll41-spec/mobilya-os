import { config as loadEnv } from 'dotenv'

// Testleri ayrı test veritabanına yönlendir (production/dev DB'ye dokunma).
// Vitest .env dosyalarını process.env'e yüklemez; Prisma ise import'ta .env'i
// otomatik yükler. Bu yüzden Prisma import edilmeden ÖNCE .env.test'i override
// ile yükleyip DATABASE_URL/DEMO_TODAY'i sabitliyoruz. Böylece testler izole ve
// tekrar çalıştırılabilir olur.
loadEnv({ path: '.env.test', override: true })

process.env.AUTH_DISABLED = 'true'
process.env.JWT_SECRET = 'test-jwt-secret-mobilya-os'
process.env.AUTH_JWT_SECRET = 'test-jwt-secret-mobilya-os'
