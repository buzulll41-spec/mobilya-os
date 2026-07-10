import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { InvestorIntelligenceResponseDto } from '../contracts/investorIntelligenceDto.js'

import { assembleInvestorIntelligence, gatherInvestorContext } from './investorIntelligenceEngine.js'



export async function getInvestorIntelligence(

  prisma: PrismaClient,

): Promise<InvestorIntelligenceResponseDto> {

  try {

    const ctx = await gatherInvestorContext(prisma)

    return assembleInvestorIntelligence(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}


