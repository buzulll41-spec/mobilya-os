import ErpOpsHubShell from '../../components/erp-ops/ErpOpsHubShell.jsx'
import { useHubTab } from '../../hooks/useHubTab.js'
import ProductMasterCenterPage from '../ProductMasterCenterPage.jsx'
import ProductsPage from '../ProductsPage.jsx'
import '../../styles/mos-erp-ops.css'

const TABS = [
  { id: 'master', label: 'Ürün Master' },
  { id: 'cards', label: 'Ürün Kartları' },
]

export default function ProductMasterHubPage() {
  const [tab, setTab] = useHubTab('product-master-center', 'master', TABS.map((t) => t.id))

  return (
    <ErpOpsHubShell
      title="Ürün Master Merkezi"
      subtitle="Single Source of Truth · ürün omurgası · kart yönetimi"
      className="mos-hub--product"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'master' ? <ProductMasterCenterPage embedded /> : <ProductsPage embedded />}
    </ErpOpsHubShell>
  )
}
