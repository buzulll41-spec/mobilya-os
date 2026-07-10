import { saveAuthSession } from '../../../src/services/authSessionStore.js'

/**
 * Foundation testleri için oturum açmış ADMIN kullanıcı kurar.
 *
 * Gerçek uygulamada `createOrder` gibi mutasyonlar her zaman kimliği
 * doğrulanmış bir kullanıcı bağlamında çağrılır (App `requiresLogin` ile
 * korunur). mockApi'nin RBAC guard'ı (`canCreateSalesOrder`) bunu bekler;
 * bu yardımcı, oturum kuran diğer testlerle aynı ADMIN profilini paylaşır.
 */
export function authenticateTestAdmin() {
  saveAuthSession({
    token: 'test-admin',
    user: {
      id: 'mock-admin',
      fullName: 'Admin',
      email: 'admin@mobilya.local',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  })
}
