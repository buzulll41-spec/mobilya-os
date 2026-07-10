import ErpOpsHubShell from '../../components/erp-ops/ErpOpsHubShell.jsx'
import { useHubTab } from '../../hooks/useHubTab.js'
import CeoControlCenterPage from '../CeoControlCenterPage.jsx'
import ExecutiveWarRoomPage from '../ExecutiveWarRoomPage.jsx'
import CashRadarPage from '../CashRadarPage.jsx'
import '../../styles/mos-erp-ops.css'

const TABS = [
  { id: 'ceo', label: 'CEO Kontrol' },
  { id: 'war-room', label: 'Yönetim Savaş Odası' },
  { id: 'cash-radar', label: 'Nakit Radarı' },
]

export default function CeoControlHubPage() {
  const [tab, setTab] = useHubTab('ceo-control-center', 'ceo', TABS.map((t) => t.id))

  return (
    <ErpOpsHubShell
      title="CEO Kontrol Merkezi"
      subtitle="Yönetim özeti · nakit · operasyon riski"
      className="mos-hub--ceo"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'ceo' ? (
        <CeoControlCenterPage embedded />
      ) : tab === 'war-room' ? (
        <ExecutiveWarRoomPage embedded />
      ) : (
        <CashRadarPage embedded />
      )}
    </ErpOpsHubShell>
  )
}
