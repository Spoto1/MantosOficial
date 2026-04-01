-- CreateEnum
CREATE TYPE "KanbanTaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "KanbanTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "KanbanTaskType" AS ENUM ('DESIGN', 'FRONTEND', 'BACKEND', 'ADMIN', 'CHECKOUT', 'AUTH', 'CAMPAIGNS', 'CONTENT', 'INFRA', 'BUG', 'POLISH', 'SECURITY', 'OPS');

-- AlterEnum
ALTER TYPE "ActivityEntityType" ADD VALUE 'KANBAN_TASK';

-- CreateTable
CREATE TABLE "KanbanTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "status" "KanbanTaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "KanbanTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "type" "KanbanTaskType" NOT NULL DEFAULT 'BACKEND',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanTaskChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanTaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanTask_isArchived_status_sortOrder_idx" ON "KanbanTask"("isArchived", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "KanbanTask_priority_updatedAt_idx" ON "KanbanTask"("priority", "updatedAt");

-- CreateIndex
CREATE INDEX "KanbanTask_type_updatedAt_idx" ON "KanbanTask"("type", "updatedAt");

-- CreateIndex
CREATE INDEX "KanbanTask_assigneeId_status_idx" ON "KanbanTask"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "KanbanTask_dueDate_idx" ON "KanbanTask"("dueDate");

-- CreateIndex
CREATE INDEX "KanbanTaskChecklistItem_taskId_sortOrder_idx" ON "KanbanTaskChecklistItem"("taskId", "sortOrder");

-- AddForeignKey
ALTER TABLE "KanbanTask" ADD CONSTRAINT "KanbanTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanTask" ADD CONSTRAINT "KanbanTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanTask" ADD CONSTRAINT "KanbanTask_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanTaskChecklistItem" ADD CONSTRAINT "KanbanTaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "KanbanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
