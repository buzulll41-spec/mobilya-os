import ErpOpsHubShell from '../../components/erp-ops/ErpOpsHubShell.jsx'
import { useHubTab } from '../../hooks/useHubTab.js'
import OperationCasesPage from '../OperationCasesPage.jsx'
import AutomationCenterPage from '../AutomationCenterPage.jsx'
import ActionCenterPage from '../ActionCenterPage.jsx'
import '../../styles/mos-erp-ops.css'

const TABS = [
  { id: 'cases', label: 'Vakalar' },
  { id: 'automation', label: 'Otomasyon' },
  { id: 'actions', label: 'Aksiyonlar' },
]

export default function OperationHubPage() {
  const [tab, setTab] = useHubTab('operation-cases', 'cases', TABS.map((t) => t.id))

  return (
    <ErpOpsHubShell
      title="Operasyon Merkezi"
      subtitle="Vaka orkestrasyonu · otomasyon · aksiyon merkezi"
      className="mos-hub--operation"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'cases' ? (
        <OperationCasesPage embedded />
      ) : tab === 'automation' ? (
        <AutomationCenterPage embedded />
      ) : (
        <ActionCenterPage embedded />
      )}
    </ErpOpsHubShell>
  )
}
