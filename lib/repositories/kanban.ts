import "server-only";

import {
  AdminUserStatus,
  type KanbanTaskPriority,
  type KanbanTaskStatus,
  type KanbanTaskType,
  type Prisma
} from "@prisma/client";

import { KANBAN_STATUS_VALUES } from "@/lib/kanban";
import { prisma } from "@/lib/prisma";
import {
  type KanbanTaskArchiveInput,
  type KanbanTaskCommentInput,
  type KanbanTaskInput,
  type KanbanTaskReorderInput,
  kanbanChecklistToggleSchema,
  kanbanTaskArchiveSchema,
  kanbanTaskCommentSchema,
  kanbanTaskReorderSchema,
  kanbanTaskSchema
} from "@/lib/validators";

const kanbanAdminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true
} satisfies Prisma.AdminUserSelect;

const kanbanTaskCommentInclude = {
  author: {
    select: kanbanAdminUserSelect
  }
} satisfies Prisma.KanbanTaskCommentInclude;

const kanbanTaskInclude = {
  assignee: {
    select: kanbanAdminUserSelect
  },
  archivedBy: {
    select: kanbanAdminUserSelect
  },
  createdBy: {
    select: kanbanAdminUserSelect
  },
  updatedBy: {
    select: kanbanAdminUserSelect
  },
  checklistItems: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  },
  _count: {
    select: {
      comments: true
    }
  }
} satisfies Prisma.KanbanTaskInclude;

const kanbanTaskDetailInclude = {
  ...kanbanTaskInclude,
  comments: {
    include: kanbanTaskCommentInclude,
    orderBy: [{ createdAt: "asc" }]
  }
} satisfies Prisma.KanbanTaskInclude;

export type KanbanTaskRecord = Prisma.KanbanTaskGetPayload<{
  include: typeof kanbanTaskInclude;
}>;

export type KanbanTaskDetailRecord = Prisma.KanbanTaskGetPayload<{
  include: typeof kanbanTaskDetailInclude;
}>;

export type KanbanTaskCommentRecord = Prisma.KanbanTaskCommentGetPayload<{
  include: typeof kanbanTaskCommentInclude;
}>;

export type KanbanBoardSort = "manual" | "priority" | "createdAt" | "updatedAt" | "dueDate";
export type KanbanArchiveScope = "ACTIVE" | "ARCHIVED" | "ALL";

export type KanbanBoardFilters = {
  query?: string;
  status?: KanbanTaskStatus | "ALL";
  priority?: KanbanTaskPriority | "ALL";
  type?: KanbanTaskType | "ALL";
  assigneeId?: string | "ALL" | "UNASSIGNED";
  sort?: KanbanBoardSort;
  archiveScope?: KanbanArchiveScope;
};

type KanbanTaskTransaction = Prisma.TransactionClient;

type KanbanActor = {
  adminId?: string | null;
  name?: string | null;
  email?: string | null;
};

function buildKanbanWhere(filters: KanbanBoardFilters): Prisma.KanbanTaskWhereInput {
  const query = filters.query?.trim();
  const archiveScope = filters.archiveScope ?? "ACTIVE";
  const isArchived =
    archiveScope === "ALL" ? undefined : archiveScope === "ARCHIVED" ? true : false;

  return {
    isArchived,
    status: filters.status && filters.status !== "ALL" ? filters.status : undefined,
    priority: filters.priority && filters.priority !== "ALL" ? filters.priority : undefined,
    type: filters.type && filters.type !== "ALL" ? filters.type : undefined,
    assigneeId:
      filters.assigneeId === "ALL"
        ? undefined
        : filters.assigneeId === "UNASSIGNED"
          ? null
          : filters.assigneeId || undefined,
    OR: query
      ? [
          {
            title: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            description: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            notes: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            comments: {
              some: {
                body: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            }
          },
          {
            checklistItems: {
              some: {
                label: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            }
          }
        ]
      : undefined
  };
}

function getKanbanOrderBy(
  sort: KanbanBoardSort,
  archiveScope: KanbanArchiveScope
): Prisma.KanbanTaskOrderByWithRelationInput[] {
  let orderBy: Prisma.KanbanTaskOrderByWithRelationInput[];

  switch (sort) {
    case "priority":
      orderBy = [{ priority: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }];
      break;
    case "createdAt":
      orderBy = [{ createdAt: "desc" }, { priority: "desc" }];
      break;
    case "updatedAt":
      orderBy = [{ updatedAt: "desc" }, { priority: "desc" }];
      break;
    case "dueDate":
      orderBy = [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }];
      break;
    default:
      orderBy = [{ sortOrder: "asc" }, { updatedAt: "desc" }];
      break;
  }

  return archiveScope === "ALL" ? [{ isArchived: "asc" }, ...orderBy] : orderBy;
}

function dedupeIds(ids: string[]) {
  return [...new Set(ids)];
}

async function getNextSortOrder(transaction: KanbanTaskTransaction, status: KanbanTaskStatus) {
  const aggregate = await transaction.kanbanTask.aggregate({
    where: {
      status,
      isArchived: false
    },
    _max: {
      sortOrder: true
    }
  });

  return (aggregate._max.sortOrder ?? -1) + 1;
}

async function resequenceKanbanColumn(
  transaction: KanbanTaskTransaction,
  status: KanbanTaskStatus,
  ignoreTaskIds: string[] = []
) {
  const tasks = await transaction.kanbanTask.findMany({
    where: {
      status,
      isArchived: false,
      id: ignoreTaskIds.length
        ? {
            notIn: ignoreTaskIds
          }
        : undefined
    },
    select: {
      id: true
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
  });

  await Promise.all(
    tasks.map((task, index) =>
      transaction.kanbanTask.update({
        where: {
          id: task.id
        },
        data: {
          sortOrder: index
        }
      })
    )
  );
}

async function replaceChecklistItems(
  transaction: KanbanTaskTransaction,
  taskId: string,
  checklistItems: KanbanTaskInput["checklistItems"]
) {
  await transaction.kanbanTaskChecklistItem.deleteMany({
    where: {
      taskId
    }
  });

  if (checklistItems.length === 0) {
    return;
  }

  await transaction.kanbanTaskChecklistItem.createMany({
    data: checklistItems.map((item, index) => ({
      taskId,
      label: item.label,
      isDone: item.isDone,
      sortOrder: index
    }))
  });
}

export async function getKanbanBoardData(filters: KanbanBoardFilters = {}) {
  const resolvedSort = filters.sort ?? "manual";
  const archiveScope = filters.archiveScope ?? "ACTIVE";
  const [tasks, assignees, archivedTasks] = await Promise.all([
    prisma.kanbanTask.findMany({
      where: buildKanbanWhere(filters),
      include: kanbanTaskInclude,
      orderBy: getKanbanOrderBy(resolvedSort, archiveScope)
    }),
    prisma.adminUser.findMany({
      where: {
        status: AdminUserStatus.ACTIVE
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: [{ role: "asc" }, { name: "asc" }]
    }),
    prisma.kanbanTask.findMany({
      where: {
        isArchived: true
      },
      select: {
        title: true,
        description: true
      }
    })
  ]);
  const operationalTasks = tasks;
  const archivedTotalCount = archivedTasks.length;

  const groupedTasks = Object.fromEntries(
    KANBAN_STATUS_VALUES.map((status) => [
      status,
      operationalTasks.filter((task) => task.status === status)
    ])
  ) as Record<(typeof KANBAN_STATUS_VALUES)[number], KanbanTaskRecord[]>;

  const now = Date.now();
  const visibleActiveTasks = operationalTasks.filter((task) => !task.isArchived);
  const overdueCount = visibleActiveTasks.filter(
    (task) => task.dueDate && task.status !== "DONE" && task.dueDate.getTime() < now
  ).length;
  const completedCount = operationalTasks.filter((task) => task.status === "DONE").length;

  return {
    tasks: operationalTasks,
    groupedTasks,
    assignees,
    stats: {
      total: operationalTasks.length,
      completedCount,
      overdueCount,
      criticalCount: visibleActiveTasks.filter((task) => task.priority === "CRITICAL").length,
      archivedTotalCount,
      activeVisibleCount: visibleActiveTasks.length,
      archivedVisibleCount: operationalTasks.filter((task) => task.isArchived).length,
      completionRate:
        operationalTasks.length > 0 ? Math.round((completedCount / operationalTasks.length) * 100) : 0
    }
  };
}

export async function getKanbanTaskById(id: string) {
  return prisma.kanbanTask.findUnique({
    where: {
      id
    },
    include: kanbanTaskDetailInclude
  });
}

export async function getKanbanAssignees() {
  return prisma.adminUser.findMany({
    where: {
      status: AdminUserStatus.ACTIVE
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });
}

export async function getKanbanDashboardSummary() {
  const now = new Date();
  const [allTasks, recentUpdatedTaskCandidates] = await Promise.all([
    prisma.kanbanTask.findMany({
      select: {
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        isArchived: true
      }
    }),
    prisma.kanbanTask.findMany({
      where: {
        isArchived: false
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 16,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        _count: {
          select: {
            comments: true,
            checklistItems: true
          }
        }
      }
    })
  ]);
  const operationalTasks = allTasks;
  const activeOperationalTasks = operationalTasks.filter((task) => !task.isArchived);
  const recentUpdatedTasks = recentUpdatedTaskCandidates.slice(0, 5);

  return {
    total: activeOperationalTasks.length,
    inProgressCount: activeOperationalTasks.filter((task) => task.status === "IN_PROGRESS").length,
    blockedCount: activeOperationalTasks.filter((task) => task.status === "BLOCKED").length,
    reviewCount: activeOperationalTasks.filter((task) => task.status === "IN_REVIEW").length,
    doneCount: activeOperationalTasks.filter((task) => task.status === "DONE").length,
    criticalCount: activeOperationalTasks.filter((task) => task.priority === "CRITICAL").length,
    overdueCount: activeOperationalTasks.filter(
      (task) => task.status !== "DONE" && task.dueDate && task.dueDate < now
    ).length,
    archivedCount: operationalTasks.filter((task) => task.isArchived).length,
    recentUpdatedTasks
  };
}

export async function saveKanbanTask(input: KanbanTaskInput, actor?: KanbanActor) {
  const parsed = kanbanTaskSchema.parse(input);

  if (parsed.id) {
    const existingTask = await prisma.kanbanTask.findUnique({
      where: {
        id: parsed.id
      },
      select: {
        id: true,
        status: true,
        sortOrder: true,
        isArchived: true,
        archivedAt: true,
        archivedById: true
      }
    });

    if (!existingTask) {
      throw new Error("Tarefa não encontrada para edição.");
    }

    return prisma.$transaction(async (transaction) => {
      const sortOrder =
        existingTask.isArchived && !parsed.isArchived
          ? await getNextSortOrder(transaction, parsed.status)
          : !parsed.isArchived && existingTask.status !== parsed.status
            ? await getNextSortOrder(transaction, parsed.status)
            : existingTask.sortOrder;

      const task = await transaction.kanbanTask.update({
        where: {
          id: parsed.id
        },
        data: {
          title: parsed.title,
          description: parsed.description,
          notes: parsed.notes ?? null,
          status: parsed.status,
          priority: parsed.priority,
          type: parsed.type,
          dueDate: parsed.dueDate ?? null,
          assigneeId: parsed.assigneeId ?? null,
          isArchived: parsed.isArchived,
          archivedAt: parsed.isArchived ? existingTask.archivedAt ?? new Date() : null,
          archivedById: parsed.isArchived
            ? existingTask.archivedById ?? actor?.adminId ?? null
            : null,
          sortOrder,
          updatedById: actor?.adminId ?? null
        },
        include: kanbanTaskInclude
      });

      await replaceChecklistItems(transaction, task.id, parsed.checklistItems);

      if (!existingTask.isArchived && existingTask.status !== parsed.status) {
        await resequenceKanbanColumn(transaction, existingTask.status);
      }

      return transaction.kanbanTask.findUniqueOrThrow({
        where: {
          id: task.id
        },
        include: kanbanTaskInclude
      });
    });
  }

  return prisma.$transaction(async (transaction) => {
    const sortOrder = parsed.isArchived ? 0 : await getNextSortOrder(transaction, parsed.status);
    const task = await transaction.kanbanTask.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        notes: parsed.notes ?? null,
        status: parsed.status,
        priority: parsed.priority,
        type: parsed.type,
        dueDate: parsed.dueDate ?? null,
        assigneeId: parsed.assigneeId ?? null,
        isArchived: parsed.isArchived,
        archivedAt: parsed.isArchived ? new Date() : null,
        archivedById: parsed.isArchived ? actor?.adminId ?? null : null,
        sortOrder,
        createdById: actor?.adminId ?? null,
        updatedById: actor?.adminId ?? null
      },
      include: kanbanTaskInclude
    });

    await replaceChecklistItems(transaction, task.id, parsed.checklistItems);

    return transaction.kanbanTask.findUniqueOrThrow({
      where: {
        id: task.id
      },
      include: kanbanTaskInclude
    });
  });
}

export async function createKanbanTaskComment(input: KanbanTaskCommentInput, actor?: KanbanActor) {
  const parsed = kanbanTaskCommentSchema.parse(input);

  return prisma.$transaction(async (transaction) => {
    await transaction.kanbanTask.findUniqueOrThrow({
      where: {
        id: parsed.taskId
      },
      select: {
        id: true
      }
    });

    const comment = await transaction.kanbanTaskComment.create({
      data: {
        taskId: parsed.taskId,
        authorId: actor?.adminId ?? null,
        authorName: actor?.name?.trim() || null,
        authorEmail: actor?.email?.trim()?.toLowerCase() || null,
        body: parsed.body
      },
      include: kanbanTaskCommentInclude
    });

    const task = await transaction.kanbanTask.update({
      where: {
        id: parsed.taskId
      },
      data: {
        updatedById: actor?.adminId ?? null
      },
      select: {
        id: true,
        title: true
      }
    });

    return {
      task,
      comment
    };
  });
}

export async function setKanbanTaskArchivedState(
  input: KanbanTaskArchiveInput,
  actor?: KanbanActor
) {
  const parsed = kanbanTaskArchiveSchema.parse(input);

  return prisma.$transaction(async (transaction) => {
    const task = await transaction.kanbanTask.findUnique({
      where: {
        id: parsed.taskId
      },
      select: {
        id: true,
        title: true,
        status: true,
        isArchived: true
      }
    });

    if (!task) {
      throw new Error("Tarefa não encontrada para arquivamento.");
    }

    if (task.isArchived === parsed.isArchived) {
      return transaction.kanbanTask.findUniqueOrThrow({
        where: {
          id: task.id
        },
        include: kanbanTaskDetailInclude
      });
    }

    if (parsed.isArchived) {
      await transaction.kanbanTask.update({
        where: {
          id: task.id
        },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archivedById: actor?.adminId ?? null,
          updatedById: actor?.adminId ?? null
        }
      });

      await resequenceKanbanColumn(transaction, task.status);
    } else {
      const sortOrder = await getNextSortOrder(transaction, task.status);

      await transaction.kanbanTask.update({
        where: {
          id: task.id
        },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedById: null,
          sortOrder,
          updatedById: actor?.adminId ?? null
        }
      });
    }

    return transaction.kanbanTask.findUniqueOrThrow({
      where: {
        id: task.id
      },
      include: kanbanTaskDetailInclude
    });
  });
}

export async function reorderKanbanTasks(input: KanbanTaskReorderInput, actor?: KanbanActor) {
  const parsed = kanbanTaskReorderSchema.parse(input);
  const orderedIds = dedupeIds(parsed.orderedIds);
  const previousOrderedIds = parsed.previousOrderedIds ? dedupeIds(parsed.previousOrderedIds) : [];

  return prisma.$transaction(async (transaction) => {
    const task = await transaction.kanbanTask.findUnique({
      where: {
        id: parsed.taskId
      },
      select: {
        id: true,
        status: true,
        isArchived: true
      }
    });

    if (!task) {
      throw new Error("Tarefa não encontrada para movimentação.");
    }

    if (task.isArchived) {
      throw new Error("Tarefas arquivadas não podem ser reordenadas no board.");
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        transaction.kanbanTask.update({
          where: {
            id
          },
          data: {
            status: parsed.status,
            sortOrder: index
          }
        })
      )
    );

    if (parsed.previousStatus && parsed.previousStatus !== parsed.status) {
      await Promise.all(
        previousOrderedIds
          .filter((id) => id !== parsed.taskId)
          .map((id, index) =>
            transaction.kanbanTask.update({
              where: {
                id
              },
              data: {
                status: parsed.previousStatus,
                sortOrder: index
              }
            })
          )
      );
    }

    await transaction.kanbanTask.update({
      where: {
        id: task.id
      },
      data: {
        updatedById: actor?.adminId ?? null
      }
    });

    return transaction.kanbanTask.findUniqueOrThrow({
      where: {
        id: task.id
      },
      include: kanbanTaskInclude
    });
  });
}

export async function toggleKanbanChecklistItem(
  input: { itemId: string; isDone: boolean },
  actor?: KanbanActor
) {
  const parsed = kanbanChecklistToggleSchema.parse(input);

  return prisma.$transaction(async (transaction) => {
    const checklistItem = await transaction.kanbanTaskChecklistItem.update({
      where: {
        id: parsed.itemId
      },
      data: {
        isDone: parsed.isDone
      },
      select: {
        id: true,
        taskId: true,
        label: true,
        isDone: true
      }
    });

    await transaction.kanbanTask.update({
      where: {
        id: checklistItem.taskId
      },
      data: {
        updatedById: actor?.adminId ?? null
      }
    });

    const task = await transaction.kanbanTask.findUniqueOrThrow({
      where: {
        id: checklistItem.taskId
      },
      include: kanbanTaskDetailInclude
    });

    return {
      task,
      checklistItem
    };
  });
}
