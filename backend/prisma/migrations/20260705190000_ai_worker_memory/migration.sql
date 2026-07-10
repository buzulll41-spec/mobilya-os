-- FAZ 41 — AI Worker Memory
CREATE TABLE "ai_worker_memories" (
    "id" TEXT NOT NULL,
    "workerCode" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "sourceEvent" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_worker_memories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_worker_memories_workerCode_active_createdAt_idx"
  ON "ai_worker_memories"("workerCode", "active", "createdAt" DESC);

CREATE INDEX "ai_worker_memories_entityType_entityId_active_idx"
  ON "ai_worker_memories"("entityType", "entityId", "active");

CREATE INDEX "ai_worker_memories_importance_active_idx"
  ON "ai_worker_memories"("importance", "active");
