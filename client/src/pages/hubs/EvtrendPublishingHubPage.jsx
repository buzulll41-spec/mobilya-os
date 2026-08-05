import ErpOpsHubShell from '../../components/erp-ops/ErpOpsHubShell.jsx'
import { useHubTab } from '../../hooks/useHubTab.js'
import CommercePublishingPage from '../CommercePublishingPage.jsx'
import MediaCenterPage from '../MediaCenterPage.jsx'
import WooCommerceConnectorPage from '../WooCommerceConnectorPage.jsx'
import WooConnectionSettingsPage from '../WooConnectionSettingsPage.jsx'
import '../../styles/mos-erp-ops.css'

const TABS = [
  { id: 'publish', label: 'Yayın' },
  { id: 'media', label: 'Medya' },
  { id: 'woo', label: 'WooCommerce' },
  { id: 'woo-settings', label: 'WooCommerce Ayarları' },
]

export default function EvtrendPublishingHubPage() {
  const [tab, setTab] = useHubTab('commerce-publishing', 'publish', TABS.map((t) => t.id))

  return (
    <ErpOpsHubShell
      title="EVTREND Yayın Merkezi"
      subtitle="E-ticaret yayın · medya · WooCommerce senkronu"
      className="mos-hub--evtrend"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'publish' ? (
        <CommercePublishingPage embedded />
      ) : tab === 'media' ? (
        <MediaCenterPage embedded />
      ) : tab === 'woo-settings' ? (
        <WooConnectionSettingsPage embedded />
      ) : (
        <WooCommerceConnectorPage embedded />
      )}
    </ErpOpsHubShell>
  )
}
