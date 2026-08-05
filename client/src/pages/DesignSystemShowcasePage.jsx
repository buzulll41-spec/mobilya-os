import { useState } from 'react'
import '../mobile/design-system/MobileOpsV2.css'
import {
  ActionRow,
  Avatar,
  BottomSheet,
  ChevronRow,
  ConfirmDialog,
  EmptyState,
  FloatingActionButton,
  ListItem,
  LoadingSkeleton,
  MetricBadge,
  NotificationButton,
  OperationCard,
  PriorityBadge,
  SearchField,
  SectionHeader,
  SegmentFilter,
  Toast,
} from '../mobile/design-system/MobileOpsV2Components.jsx'

const SEGMENTS = [
  { id: 'all', label: 'Tum Islemler', count: 24 },
  { id: 'due', label: 'Bugun', count: 6 },
  { id: 'delayed', label: 'Geciken', count: 2 },
]

export default function DesignSystemShowcasePage() {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)

  return (
    <main className="evm-v2-screen-shell evm-v2-ds-v3">
      <section className="evm-v2-ds-v3__group">
        <SectionHeader
          title="Mobile Design System V3"
          subtitle="Operation-first component contract, tokenized states, responsive and accessibility baseline"
        />
        <p className="evm-v2-ds-v3__muted">State contract: light, dark, disabled, loading, selected, pressed, hovered</p>
      </section>

      <section className="evm-v2-ds-v3__row">
        <article className="evm-v2-ds-v3__panel" data-theme="light">
          <SectionHeader title="Light State" subtitle="Default interaction layer" />
          <SearchField value={search} onValueChange={setSearch} onRefresh={() => setSearch('')} />
          <SegmentFilter items={SEGMENTS} activeId={segment} onSelect={setSegment} />
          <ActionRow>
            <PriorityBadge label="Kritik" tone="red" count={3} />
            <MetricBadge label="SLA" tone="blue" count={98} />
          </ActionRow>
          <OperationCard
            title="Teslimat onaylarini bitir"
            subtitle="Saha ekibi cikmadan once eksik kayitlari tamamla"
            metaLeft="4 Kayit"
            metaRight="27 dk"
            due="14:30"
            badge={<PriorityBadge label="Oncelik 1" tone="orange" />}
            onPress={() => setToastOpen(true)}
          />
        </article>

        <article className="evm-v2-ds-v3__panel" data-theme="dark">
          <SectionHeader title="Dark State" subtitle="Same primitives, dark surface" theme="dark" />
          <ActionRow theme="dark">
            <Avatar initials="EV" theme="dark" />
            <NotificationButton badgeCount={7} theme="dark" />
          </ActionRow>
          <OperationCard
            title="Depo sevklerini dogrula"
            subtitle="Paketleme bekleyen siparisleri tek listede kontrol et"
            metaLeft="12 Bekleyen"
            metaRight="44 dk"
            due="16:00"
            badge={<PriorityBadge label="Yuksek" tone="blue" theme="dark" />}
            theme="dark"
            selected
            onPress={() => setSheetOpen(true)}
          />
          <ActionRow theme="dark">
            <PriorityBadge label="Disabled" tone="gray" theme="dark" loading />
            <PriorityBadge label="Selected" tone="green" theme="dark" selected />
          </ActionRow>
        </article>
      </section>

      <section className="evm-v2-ds-v3__group">
        <SectionHeader title="List Patterns" subtitle="ListItem and ChevronRow contracts" />
        <ListItem
          title="Operasyon ozeti"
          subtitle="Bugun onay bekleyen 9 is emri var"
          metaLabel="Kalan"
          metaValue="09"
          footnote="Anlik guncellendi"
          badge={<MetricBadge label="Canli" tone="green" />}
        />
        <ChevronRow
          title="Musteri mutabakati"
          subtitle="Acil geri donus gereken kayitlar"
          badge={<PriorityBadge label="Acil" tone="red" count={2} />}
          onPress={() => setConfirmOpen(true)}
        />
      </section>

      <section className="evm-v2-ds-v3__group">
        <SectionHeader title="States" subtitle="Loading, empty, confirm, sheet and toast" />
        <LoadingSkeleton rows={3} />
        <EmptyState
          title="Kayit bulunamadi"
          description="Filtreleri sifirlayip tekrar dene"
          actionLabel="Filtreyi temizle"
          onAction={() => {
            setSegment('all')
            setSearch('')
          }}
        />
        <ActionRow>
          <button type="button" className="evm-v2-btn evm-v2-btn--secondary" onClick={() => setSheetOpen(true)}>BottomSheet</button>
          <button type="button" className="evm-v2-btn evm-v2-btn--primary" onClick={() => setConfirmOpen(true)}>ConfirmDialog</button>
        </ActionRow>
      </section>

      <BottomSheet open={sheetOpen} title="Action Sheet" onClose={() => setSheetOpen(false)}>
        <div className="evm-v2-sheet-action-list">
          <ChevronRow title="Siparis detayi" subtitle="Kayit kimligi #SO-1128" />
          <ChevronRow title="Musteriyi ara" subtitle="Tek tikla dis arama baslat" />
          <ChevronRow title="WhatsApp paylas" subtitle="Hizli durum bildirimi" />
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmOpen}
        title="Aksiyonu onayla"
        description="Bu islem secili kayit icin geri alinamaz bir guncelleme yapacak."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          setToastOpen(true)
        }}
      />

      {toastOpen ? <Toast message="V3 action contract basariyla calisti" /> : null}

      <FloatingActionButton
        label="Hizli Islem"
        onPress={() => {
          setToastOpen(true)
          setTimeout(() => setToastOpen(false), 1800)
        }}
      />
    </main>
  )
}
