import { formatTry } from '../../data/index.js'

import { formatShortDate } from '../../utils/dates.js'



/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */



/**

 * @param {{

 *   item: ShipmentAgendaItem

 *   onOpen: (item: ShipmentAgendaItem) => void

 *   onPlan: (item: ShipmentAgendaItem) => void

 * }} props

 */

function ShipmentOpsAgendaCard({ item, onOpen, onPlan }) {

  const remainingTone =

    item.remaining <= 0.009 ? 'ok' : item.remaining / Math.max(item.amount, 1) >= 0.45 ? 'high' : 'warn'

  const riskAlert =

    item.riskLabel !== 'Normal' && item.riskLabel !== 'Tahsilat tamam'



  return (

    <article className={`sops-v3-agenda-card sops-v3-agenda-card--${item.statusTone}`}>

      <div

        className={`sops-v3-agenda-card__time${item.hasScheduledTime ? ' sops-v3-agenda-card__time--set' : ''}`}

      >

        {item.hasScheduledTime ? item.timeLabel : '—'}

      </div>



      <div

        className="sops-v3-agenda-card__main sops-v3-agenda-card__open"

        role="button"

        tabIndex={0}

        onClick={() => onOpen(item)}

        onKeyDown={(e) => {

          if (e.key === 'Enter' || e.key === ' ') {

            e.preventDefault()

            onOpen(item)

          }

        }}

      >

        <h3 className="sops-v3-agenda-card__customer">{item.customer}</h3>

        <p

          className={`sops-v3-agenda-card__region${item.hasRegion ? ' sops-v3-agenda-card__region--set' : ''}`}

        >

          📍 {item.region}

        </p>

        <p className="sops-v3-agenda-card__meta">📅 {formatShortDate(item.dateIso)}</p>

        <p

          className={`sops-v3-agenda-card__meta${item.hasScheduledTime ? '' : ' sops-v3-agenda-card__meta--muted'}`}

        >

          🕘 {item.hasScheduledTime ? item.timeLabel : 'Saat girilmedi'}

        </p>

        <p className="sops-v3-agenda-card__product" title={item.productSummary ?? item.product}>

          📦 {item.productSummary ?? item.product}

        </p>

        <p

          className={`sops-v3-agenda-card__meta${item.hasVehicle ? '' : ' sops-v3-agenda-card__meta--muted'}`}

        >

          🚚 {item.vehicleLabel}

        </p>

        <p

          className={`sops-v3-agenda-card__meta${item.hasCrew ? '' : ' sops-v3-agenda-card__meta--muted'}`}

        >

          👷 {item.crewLabel}

        </p>

        {item.planNote ? (

          <p className="sops-v3-agenda-card__note">Not: {item.planNote}</p>

        ) : null}

      </div>



      <div className="sops-v3-agenda-card__side">

        <button

          type="button"

          className="sops-v3-agenda-card__plan-btn"

          onClick={(e) => {

            e.stopPropagation()

            onPlan(item)

          }}

        >

          {item.hasPlan ? 'Düzenle' : 'Planla'}

        </button>

        <span className={`sops-v3-agenda-card__status sops-v3-agenda-card__status--${item.statusTone}`}>

          {item.statusLabel}

        </span>

        <span className={`sops-v3-agenda-card__risk${riskAlert ? ' sops-v3-agenda-card__risk--alert' : ''}`}>

          {item.riskLabel}

        </span>

        <p className="sops-v3-agenda-card__total">{formatTry(item.amount)} toplam</p>

        <p className={`sops-v3-agenda-card__remaining sops-v3-agenda-card__remaining--${remainingTone}`}>

          💰 {formatTry(item.remaining)} kalan

        </p>

      </div>

    </article>

  )

}



/**

 * @param {{

 *   items: ShipmentAgendaItem[]

 *   selectedDate: string

 *   onOpenItem: (item: ShipmentAgendaItem) => void

 *   onPlanItem: (item: ShipmentAgendaItem) => void

 * }} props

 */

export default function ShipmentOpsAgendaList({ items, selectedDate, onOpenItem, onPlanItem }) {

  if (!items.length) {

    return (

      <div className="sops-v3-agenda-empty">

        <p className="mos-empty">{formatShortDate(selectedDate)} için planlı sevk yok.</p>

      </div>

    )

  }



  return (

    <div className="sops-v3-agenda-list" role="list">

      {items.map((item) => (

        <ShipmentOpsAgendaCard key={item.id} item={item} onOpen={onOpenItem} onPlan={onPlanItem} />

      ))}

    </div>

  )

}


