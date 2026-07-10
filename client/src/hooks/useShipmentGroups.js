import { useCallback, useState } from 'react'
import { createShipmentGroup, loadAllShipmentGroups } from '../state/shipmentGroupStore.js'

/** @typedef {import('../state/shipmentGroupStore.js').ShipmentGroup} ShipmentGroup */

export function useShipmentGroups() {
  const [groups, setGroups] = useState(() => loadAllShipmentGroups())

  const registerGroup = useCallback((/** @type {Parameters<typeof createShipmentGroup>[0]} */ input) => {
    const group = createShipmentGroup(input)
    setGroups((prev) => [group, ...prev])
    return group
  }, [])

  return { groups, registerGroup }
}
