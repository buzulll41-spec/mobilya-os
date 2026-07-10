import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { ExecutiveDirectorResponseDto } from '../contracts/executiveDirectorDto.js'
import {
  assembleExecutiveDirectorResponse,
  gatherDirectorContext,
  recordDirectorRun,
} from './executiveDirectorEngine.js'

export async function getExecutiveDirector(
  prisma: PrismaClient,
): Promise<ExecutiveDirectorResponseDto> {
  try {
    const director = await gatherDirectorContext(prisma)
    return assembleExecutiveDirectorResponse(director)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function runExecutiveDirector(
  prisma: PrismaClient,
): Promise<ExecutiveDirectorResponseDto> {
  try {
    const ranAt = new Date().toISOString()
    recordDirectorRun(ranAt)
    const director = await gatherDirectorContext(prisma)
    return assembleExecutiveDirectorResponse({ ...director, lastRunAt: ranAt })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
