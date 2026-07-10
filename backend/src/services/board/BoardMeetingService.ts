import type { PrismaClient } from '@prisma/client'
import type { BoardMeetingHistoryDto, BoardMeetingRecordDto } from '../../contracts/strategicBoardDto.js'
import { runStrategicBoardMeeting, resetBoardMeetingEngineSeqForTests } from './BoardMeetingEngine.js'

let history: BoardMeetingRecordDto[] = []
let seeded = false

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function ensureSeeded(_prisma: PrismaClient) {
  if (seeded) return
  history = [
    runStrategicBoardMeeting({
      question: 'Neden satış düştü?',
      todayIso: todayIso(),
    }),
  ]
  seeded = true
}

export async function runBoardMeeting(prisma: PrismaClient, question: string): Promise<BoardMeetingRecordDto> {
  await ensureSeeded(prisma)
  const meeting = runStrategicBoardMeeting({ question: question.trim() || 'Bugünkü şirket toplantısı', todayIso: todayIso() })
  history = [meeting, ...history].slice(0, 100)
  return meeting
}

export async function getLatestBoardMeeting(prisma: PrismaClient): Promise<BoardMeetingRecordDto | null> {
  await ensureSeeded(prisma)
  return history[0] ?? null
}

export async function getBoardMeetingHistory(prisma: PrismaClient, limit = 20): Promise<BoardMeetingHistoryDto> {
  await ensureSeeded(prisma)
  return { records: history.slice(0, limit), total: history.length }
}

export function resetBoardMeetingStoreForTests(): void {
  history = []
  seeded = false
  resetBoardMeetingEngineSeqForTests()
}
