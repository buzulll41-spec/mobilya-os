import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { CompanySimulationResponseDto, SimulationInputDto } from '../contracts/companySimulationDto.js'
import {
  assembleCompanySimulation,
  gatherSimulationBaseline,
  recordSimulationRun,
} from './companySimulationEngine.js'

export async function getCompanySimulation(
  prisma: PrismaClient,
): Promise<CompanySimulationResponseDto> {
  try {
    const baseline = await gatherSimulationBaseline(prisma)
    return assembleCompanySimulation(baseline, {})
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function runCompanySimulation(
  prisma: PrismaClient,
  input: SimulationInputDto = {},
): Promise<CompanySimulationResponseDto> {
  try {
    const ranAt = new Date().toISOString()
    recordSimulationRun(ranAt)
    const baseline = await gatherSimulationBaseline(prisma)
    return assembleCompanySimulation(baseline, input, ranAt)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
