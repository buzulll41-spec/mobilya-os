import { useEffect, useMemo, useState } from 'react'

import {

  applyKanbanFilters,

  buildKanbanBoard,

} from '../mappers/operation-map/operationMapKanbanModel.js'

import {

  evaluateSalesFollowUp,

  listAiSalesFollowUpOrderIds,

} from '../services/aiSalesFollowUpService.js'

import {

  evaluateCollectionSpecialist,

  listAiCollectionSpecialistOrderIds,

} from '../services/aiCollectionSpecialistService.js'

import {

  evaluateShipmentSpecialist,

  listAiShipmentSpecialistOrderIds,

} from '../services/aiShipmentSpecialistService.js'

import {

  evaluateProcurementSpecialist,

  listAiProcurementSpecialistOrderIds,

} from '../services/aiProcurementSpecialistService.js'

import { getAllDomainEventsSnapshot } from '../services/mockDomainEventStore.js'

import { getOrchestrationSnapshot, subscribeWorkerOrchestrator } from '../services/workerOrchestratorClient.js'

import { WORKER_DISPLAY_NAMES } from '../contracts/v1/workerOrchestration.js'

import OperationMapToolbar from '../features/operation-map/OperationMapToolbar.jsx'

import OperationMapKanbanBoard from '../features/operation-map/OperationMapKanbanBoard.jsx'

import '../styles/operation-map.css'



/** @typedef {import('../data/seedOrders.js').Order} Order */

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */



/**

 * @param {{

 *   orders: Order[]

 *   listItemDtos: SalesOrderListItemDto[]

 *   todayIso: string

 *   onOpenOrder: (orderId: string) => void

 * }} props

 */

export default function OperationMapPage({ orders, listItemDtos, todayIso, onOpenOrder }) {

  const [activeFilter, setActiveFilter] = useState('all')

  const [searchQuery, setSearchQuery] = useState('')

  const [orchVersion, setOrchVersion] = useState(0)



  useEffect(() => {

    const unsub = subscribeWorkerOrchestrator(() => setOrchVersion((v) => v + 1))

    return unsub

  }, [])



  const aiActiveByOrderId = useMemo(() => {

    void orchVersion

    const snap = getOrchestrationSnapshot()

    const map = new Map()

    for (const [orderId, activity] of snap.activeByOrderId.entries()) {

      map.set(orderId, {

        ...activity,

        workerLabel: WORKER_DISPLAY_NAMES[activity.workerId] ?? activity.workerId,

      })

    }

    return map

  }, [orchVersion])



  const aiSalesOrderIds = useMemo(() => {

    const assessments = evaluateSalesFollowUp(

      orders,

      listItemDtos,

      todayIso,

      getAllDomainEventsSnapshot(),

      [],

    )

    return listAiSalesFollowUpOrderIds(assessments)

  }, [orders, listItemDtos, todayIso])



  const aiCollectionOrderIds = useMemo(() => {

    const assessments = evaluateCollectionSpecialist(

      orders,

      listItemDtos,

      todayIso,

      getAllDomainEventsSnapshot(),

      [],

    )

    return listAiCollectionSpecialistOrderIds(assessments)

  }, [orders, listItemDtos, todayIso])



  const aiShipmentOrderIds = useMemo(() => {

    const assessments = evaluateShipmentSpecialist(

      orders,

      listItemDtos,

      todayIso,

      getAllDomainEventsSnapshot(),

      [],

    )

    return listAiShipmentSpecialistOrderIds(assessments)

  }, [orders, listItemDtos, todayIso])



  const aiProcurementOrderIds = useMemo(() => {

    const assessments = evaluateProcurementSpecialist(

      orders,

      listItemDtos,

      todayIso,

      getAllDomainEventsSnapshot(),

      [],

    )

    return listAiProcurementSpecialistOrderIds(assessments)

  }, [orders, listItemDtos, todayIso])



  const board = useMemo(

    () =>

      buildKanbanBoard(orders, listItemDtos, todayIso, {

        aiSalesOrderIds,

        aiCollectionOrderIds,

        aiShipmentOrderIds,

        aiProcurementOrderIds,

        aiActiveByOrderId,

      }),

    [

      orders,

      listItemDtos,

      todayIso,

      aiSalesOrderIds,

      aiCollectionOrderIds,

      aiShipmentOrderIds,

      aiProcurementOrderIds,

      aiActiveByOrderId,

    ],

  )



  const filteredGrouped = useMemo(

    () => applyKanbanFilters(board.grouped, activeFilter, searchQuery),

    [board.grouped, activeFilter, searchQuery],

  )



  const totalCards = useMemo(

    () => Object.values(filteredGrouped).reduce((n, cards) => n + cards.length, 0),

    [filteredGrouped],

  )



  return (

    <div className="opmap-page opmap-page--kanban">

      <header className="opmap-page__head">

        <div>

          <p className="opmap-page__eyebrow">Operasyon Merkezi</p>

          <h1 className="opmap-page__title">Operasyon Haritası</h1>

          <p className="opmap-page__subtitle">

            Mevcut siparişlerin kanban görünümü — AI çalışırken kartlar canlı renk alır.

          </p>

        </div>

      </header>



      <OperationMapToolbar

        activeFilter={activeFilter}

        onFilterChange={setActiveFilter}

        searchQuery={searchQuery}

        onSearchChange={setSearchQuery}

        totalCards={totalCards}

      />



      <OperationMapKanbanBoard

        columns={board.columns}

        grouped={filteredGrouped}

        onOpenOrder={onOpenOrder}

      />

    </div>

  )

}


