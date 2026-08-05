import { useCallback, useEffect, useMemo, useState } from 'react'
import { USER_ROLE } from '../contracts/v1/user.js'
import * as usersClient from '../services/usersClient.js'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import ErpOpsDetailStrip from '../components/erp-ops/ErpOpsDetailStrip.jsx'
import {
  USERS_ROLE_FILTERS,
  buildUsersOpsSummary,
  countUsersFilter,
  filterUsers,
  userToErpTableRow,
} from '../features/users/usersOpsCenterUi.js'
import '../styles/mos-erp-ops.css'

const ROLE_OPTIONS = [
  { value: USER_ROLE.ADMIN, label: 'Yönetici' },
  { value: USER_ROLE.MANAGER, label: 'Müdür' },
  { value: USER_ROLE.SALES, label: 'Satış' },
  { value: USER_ROLE.OPERATION, label: 'Operasyon' },
  { value: USER_ROLE.SERVICE, label: 'Servis' },
  { value: USER_ROLE.FINANCE, label: 'Finans' },
  { value: USER_ROLE.WAREHOUSE, label: 'Depo' },
]

/** @typedef {import('../contracts/v1/user.js').UserDto} UserDto */
/** @typedef {import('../features/users/usersOpsCenterUi.js').UsersFilterId} UsersFilterId */

export default function UsersAdminPage() {
  const [users, setUsers] = useState(/** @type {UserDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [tempPassword, setTempPassword] = useState(/** @type {{ email: string, password: string } | null} */ (null))
  const [showCreate, setShowCreate] = useState(false)
  const [activeFilter, setActiveFilter] = useState(/** @type {UsersFilterId} */ ('all'))
  const [selectedUserId, setSelectedUserId] = useState(/** @type {string | null} */ (null))
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    role: USER_ROLE.SALES,
    password: '',
  })

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await usersClient.listUsers()
      setUsers(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcılar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredUsers = useMemo(
    () => filterUsers(users, activeFilter),
    [users, activeFilter],
  )

  const tableRows = useMemo(() => filteredUsers.map(userToErpTableRow), [filteredUsers])

  const summaryMetrics = useMemo(() => buildUsersOpsSummary(users), [users])

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of USERS_ROLE_FILTERS) {
      counts[f.id] = countUsersFilter(users, f.id)
    }
    return counts
  }, [users])

  const selectedUser = useMemo(
    () => filteredUsers.find((u) => u.id === selectedUserId) ?? filteredUsers[0] ?? null,
    [filteredUsers, selectedUserId],
  )

  const selectedRow = useMemo(
    () => tableRows.find((r) => r.id === selectedUser?.id) ?? tableRows[0] ?? null,
    [tableRows, selectedUser],
  )

  useEffect(() => {
    if (tableRows.length === 0) {
      setSelectedUserId(null)
      return
    }
    if (!tableRows.some((r) => r.id === selectedUserId)) {
      setSelectedUserId(tableRows[0].id)
    }
  }, [tableRows, selectedUserId])

  async function handleToggleActive(u) {
    try {
      await usersClient.patchUser(u.id, { isActive: !u.isActive })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncelleme başarısız')
    }
  }

  async function handleRoleChange(u, role) {
    try {
      await usersClient.patchUser(u.id, { role })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rol güncellenemedi')
    }
  }

  async function handleResetPassword(u) {
    try {
      const res = await usersClient.resetUserPassword(u.id)
      setTempPassword({ email: res.user.email, password: res.temporaryPassword })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre sıfırlanamadı')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    try {
      await usersClient.createUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        password: createForm.password,
      })
      setShowCreate(false)
      setCreateForm({ fullName: '', email: '', role: USER_ROLE.SALES, password: '' })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı')
    }
  }

  if (loading) return <LoadingBlock title="Kullanıcılar" hint="Yükleniyor" />

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Kullanıcı yönetimi</h1>
          <span className="mos-erp-ops__sub">{users.length} hesap · {filteredUsers.length} listede</span>
        </div>
        <div className="mos-erp-ops__head-actions">
          <button
            type="button"
            className="mos-erp-ops__btn mos-erp-ops__btn--primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'İptal' : 'Yeni kullanıcı'}
          </button>
        </div>
      </header>

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      {tempPassword ? (
        <div className="mos-erp-ops__banner" role="status">
          <strong>Geçici şifre — {tempPassword.email}</strong>
          <code>{tempPassword.password}</code>
          <button type="button" className="mos-erp-ops__btn" onClick={() => setTempPassword(null)}>
            Kapat
          </button>
        </div>
      ) : null}

      {showCreate ? (
        <form className="mos-erp-ops__create" onSubmit={(e) => void handleCreate(e)}>
          <label>
            Ad soyad
            <input
              required
              value={createForm.fullName}
              onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </label>
          <label>
            E-posta
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            Rol
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Başlangıç şifresi (min 6)
            <input
              type="password"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
          <button type="submit" className="mos-erp-ops__btn mos-erp-ops__btn--primary">
            Kaydet
          </button>
        </form>
      ) : null}

      <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Kullanıcı özeti" />

      <div className="mos-erp-ops__workspace">
        <ErpOpsLeftFilters
          groups={[{ title: 'Kapsam', options: USERS_ROLE_FILTERS }]}
          activeFilter={activeFilter}
          filterCounts={filterCounts}
          onFilterChange={(id) => setActiveFilter(/** @type {UsersFilterId} */ (id))}
          ariaLabel="Kullanıcı filtreleri"
        />

        <div className="mos-erp-ops__main">
          <ErpOpsDetailStrip
            row={selectedRow}
            emptyLabel="Tablodan kullanıcı seçin."
            actionLabel="Şifre sıfırla"
            onOpen={() => selectedUser && void handleResetPassword(selectedUser)}
          />

          {selectedUser ? (
            <div className="mos-erp-detail__actions-row">
              <button
                type="button"
                className="mos-erp-ops__btn"
                onClick={() => void handleToggleActive(selectedUser)}
              >
                {selectedUser.isActive ? 'Pasife al' : 'Aktifleştir'}
              </button>
            </div>
          ) : null}

          <section className="mos-erp-ops__table-panel mos-erp-ops__users-table" aria-label="Kullanıcı listesi">
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Ad soyad</th>
                    <th>E-posta</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th className="is-ops">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={5}>Bu filtrede kullanıcı yok.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const selected = selectedUserId === u.id
                      return (
                        <tr
                          key={u.id}
                          className={`mos-erp-tbl-row${selected ? ' is-selected' : ''}`}
                          onClick={() => setSelectedUserId(u.id)}
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedUserId(u.id)
                            }
                          }}
                        >
                          <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{u.fullName}</td>
                          <td className="mos-erp-tbl-td mos-erp-tbl-td--order">{u.email}</td>
                          <td className="mos-erp-tbl-td">
                            <select
                              value={u.role}
                              aria-label={`${u.fullName} rolü`}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => void handleRoleChange(u, e.target.value)}
                            >
                              {ROLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className={`mos-erp-tbl-td mos-erp-tbl-td--status${u.isActive ? ' is-success' : ''}`}
                          >
                            {u.isActive ? 'Aktif' : 'Pasif'}
                          </td>
                          <td className="mos-erp-tbl-td is-ops">
                            <button
                              type="button"
                              className="mos-erp-tbl-op"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleResetPassword(u)
                              }}
                            >
                              Sıfırla
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
