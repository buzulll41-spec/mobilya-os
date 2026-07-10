import { calculateProductHealth, type ProductHealthInput } from './calculateProductHealth.js'

export type PersistedMasterHealth = {
  productHealthScore: number
  missingFields: string[]
}

export function computePersistedMasterHealth(input: ProductHealthInput): PersistedMasterHealth {
  const result = calculateProductHealth(input)
  return {
    productHealthScore: result.score,
    missingFields: result.missingLabels,
  }
}
