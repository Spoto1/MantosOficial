-- AlterTable
ALTER TABLE "KanbanTask"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT;

-- CreateTable
CREATE TABLE "KanbanTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanTask_archivedAt_idx" ON "KanbanTask"("archivedAt");

-- CreateIndex
CREATE INDEX "KanbanTask_archivedById_idx" ON "KanbanTask"("archivedById");

-- CreateIndex
CREATE INDEX "KanbanTaskComment_taskId_createdAt_idx" ON "KanbanTaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "KanbanTaskComment_authorId_createdAt_idx" ON "KanbanTaskComment"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "KanbanTask" ADD CONSTRAINT "KanbanTask_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanTaskComment" ADD CONSTRAINT "KanbanTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "KanbanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanTaskComment" ADD CONSTRAINT "KanbanTaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
