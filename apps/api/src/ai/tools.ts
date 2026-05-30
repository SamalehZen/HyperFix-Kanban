import { tool } from "ai";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import createCommentCtrl from "../activity/controllers/create-comment";
import getColumnsCtrl from "../column/controllers/get-columns";
import db from "../database";
import { labelTable, projectTable } from "../database/schema";
import createLabelCtrl from "../label/controllers/create-label";
import getLabelsByTaskIdCtrl from "../label/controllers/get-labels-by-task-id";
import getLabelsByWorkspaceIdCtrl from "../label/controllers/get-labels-by-workspace-id";
import unassignLabelFromTaskCtrl from "../label/controllers/unassign-label-from-task";
import getProjectsCtrl from "../project/controllers/get-projects";
import globalSearchCtrl from "../search/controllers/global-search";
import bulkUpdateTasksCtrl from "../task/controllers/bulk-update-tasks";
import createTaskCtrl from "../task/controllers/create-task";
import deleteTaskCtrl from "../task/controllers/delete-task";
import getTaskCtrl from "../task/controllers/get-task";
import getTasksCtrl from "../task/controllers/get-tasks";
import moveTaskCtrl from "../task/controllers/move-task";
import updateTaskAssigneeCtrl from "../task/controllers/update-task-assignee";
import updateTaskDescriptionCtrl from "../task/controllers/update-task-description";
import updateTaskDueDateCtrl from "../task/controllers/update-task-due-date";
import updateTaskPriorityCtrl from "../task/controllers/update-task-priority";
import updateTaskStatusCtrl from "../task/controllers/update-task-status";
import updateTaskTitleCtrl from "../task/controllers/update-task-title";
import { validateWorkspaceAccess } from "../utils/validate-workspace-access";
import {
  ADMIN_WORKSPACE_ROLES,
  assertAdminWorkspaceRole,
  assertOwnTodoTask,
  assertWorkspaceRole,
  assertWorkspaceTaskAccess,
  TODO_STATUS_SLUG,
} from "../utils/workspace-role";
import getWorkspaceMembersCtrl from "../workspace/controllers/get-workspace-members";

const PRIORITY_ENUM = z.enum([
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
]);

/**
 * Runs a tool body and converts thrown errors (notably permission/validation
 * HTTPExceptions) into a structured result the model can read and relay to the
 * user, instead of crashing the whole stream.
 */
async function safe<T>(
  fn: () => Promise<T>,
): Promise<T | { error: string; status?: number }> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HTTPException) {
      return { error: error.message, status: error.status };
    }
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function getProjectOrThrow(projectId: string) {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }
  return project;
}

function parseDueDate(dueDate?: string | null): Date | null {
  if (!dueDate) return null;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new HTTPException(400, {
      message: `Invalid date "${dueDate}". Use ISO 8601 (e.g. 2026-06-15).`,
    });
  }
  return parsed;
}

export function getAiTools(userId: string) {
  return {
    // ----- Read / discovery -----
    list_projects: tool({
      description:
        "Lister tous les projets d'un espace de travail (workspace).",
      inputSchema: z.object({
        workspaceId: z.string().describe("L'ID de l'espace de travail"),
      }),
      execute: ({ workspaceId }) =>
        safe(async () => {
          await validateWorkspaceAccess(userId, workspaceId);
          return await getProjectsCtrl(workspaceId);
        }),
    }),

    list_columns: tool({
      description:
        "Lister les colonnes (statuts valides) d'un projet. Utilise les `slug` comme valeurs de statut pour créer/déplacer une tâche.",
      inputSchema: z.object({
        projectId: z.string().describe("L'ID du projet"),
      }),
      execute: ({ projectId }) =>
        safe(async () => {
          const project = await getProjectOrThrow(projectId);
          await validateWorkspaceAccess(userId, project.workspaceId);
          const columns = await getColumnsCtrl(projectId);
          return columns.map((c) => ({
            slug: c.slug,
            name: c.name,
            position: c.position,
          }));
        }),
    }),

    list_members: tool({
      description:
        "Lister les membres d'un workspace avec leur rôle (owner/admin/member). Sert à résoudre un nom en ID pour l'assignation et à vérifier les permissions.",
      inputSchema: z.object({
        workspaceId: z.string().describe("L'ID de l'espace de travail"),
      }),
      execute: ({ workspaceId }) =>
        safe(async () => {
          await validateWorkspaceAccess(userId, workspaceId);
          return await getWorkspaceMembersCtrl(workspaceId);
        }),
    }),

    list_labels: tool({
      description: "Lister tous les labels existants d'un workspace.",
      inputSchema: z.object({
        workspaceId: z.string().describe("L'ID de l'espace de travail"),
      }),
      execute: ({ workspaceId }) =>
        safe(async () => {
          await validateWorkspaceAccess(userId, workspaceId);
          return await getLabelsByWorkspaceIdCtrl(workspaceId);
        }),
    }),

    list_tasks: tool({
      description:
        "Lister les tâches d'un projet avec filtres optionnels (statut, priorité, assigné).",
      inputSchema: z.object({
        projectId: z.string().describe("L'ID du projet"),
        status: z
          .string()
          .optional()
          .describe("Filtrer par statut/colonne (ex: 'to-do', 'in-progress')"),
        priority: PRIORITY_ENUM.optional().describe("Filtrer par priorité"),
        assigneeId: z
          .string()
          .optional()
          .describe("L'ID de l'utilisateur assigné"),
      }),
      execute: ({ projectId, status, priority, assigneeId }) =>
        safe(async () => {
          const project = await getProjectOrThrow(projectId);
          await validateWorkspaceAccess(userId, project.workspaceId);
          return await getTasksCtrl(projectId, {
            status,
            priority,
            assigneeId,
          });
        }),
    }),

    get_task: tool({
      description:
        "Obtenir les détails complets d'une tâche (avec ses labels) à partir de son ID.",
      inputSchema: z.object({
        taskId: z.string().describe("L'ID de la tâche à récupérer"),
      }),
      execute: ({ taskId }) =>
        safe(async () => {
          await assertWorkspaceTaskAccess(taskId, userId);
          const task = await getTaskCtrl(taskId);
          const labels = await getLabelsByTaskIdCtrl(taskId);
          return { ...task, labels };
        }),
    }),

    search: tool({
      description:
        "Rechercher globalement des tâches, projets ou commentaires dans un workspace.",
      inputSchema: z.object({
        query: z.string().describe("Le terme de recherche"),
        workspaceId: z.string().describe("L'ID de l'espace de travail"),
        type: z
          .enum(["all", "tasks", "projects", "comments", "activities"])
          .optional()
          .default("all")
          .describe("Le type d'éléments à chercher"),
      }),
      execute: ({ query, workspaceId, type }) =>
        safe(async () => {
          await validateWorkspaceAccess(userId, workspaceId);
          return await globalSearchCtrl({
            query,
            userId,
            workspaceId,
            type,
            limit: 15,
          });
        }),
    }),

    // ----- Create -----
    create_task: tool({
      description:
        "Créer une nouvelle tâche dans un projet. Un membre ne peut créer que dans la colonne To-Do et la tâche lui est auto-assignée.",
      inputSchema: z.object({
        projectId: z.string().describe("L'ID du projet"),
        title: z.string().describe("Le titre de la tâche"),
        status: z
          .string()
          .describe("Le statut/colonne initial (slug, ex: 'to-do')"),
        priority: PRIORITY_ENUM.describe("Le niveau de priorité"),
        description: z
          .string()
          .optional()
          .default("")
          .describe("Description (Markdown autorisé)"),
        dueDate: z
          .string()
          .optional()
          .describe("Date d'échéance optionnelle (ISO 8601)"),
        assigneeId: z
          .string()
          .optional()
          .describe("ID du membre assigné (admin/owner uniquement)"),
      }),
      execute: ({
        projectId,
        title,
        status,
        priority,
        description,
        dueDate,
        assigneeId,
      }) =>
        safe(async () => {
          const project = await getProjectOrThrow(projectId);
          const role = await assertWorkspaceRole(userId, project.workspaceId, [
            "owner",
            "admin",
            "member",
          ]);

          let resolvedAssignee: string | null | undefined = assigneeId;
          const resolvedStatus = status || TODO_STATUS_SLUG;
          if (!ADMIN_WORKSPACE_ROLES.includes(role)) {
            if (resolvedStatus !== TODO_STATUS_SLUG) {
              throw new HTTPException(403, {
                message:
                  "Les membres ne peuvent créer des tâches que dans la colonne To-Do.",
              });
            }
            // Members cannot assign others.
            resolvedAssignee = userId;
          }

          return await createTaskCtrl({
            projectId,
            currentUserId: userId,
            userId: resolvedAssignee,
            title,
            status: resolvedStatus,
            description,
            priority,
            dueDate: parseDueDate(dueDate) ?? undefined,
          });
        }),
    }),

    create_comment: tool({
      description: "Ajouter un commentaire à une tâche existante.",
      inputSchema: z.object({
        taskId: z.string().describe("L'ID de la tâche"),
        content: z.string().describe("Le texte du commentaire (Markdown)"),
      }),
      execute: ({ taskId, content }) =>
        safe(async () => {
          await assertWorkspaceTaskAccess(taskId, userId);
          return await createCommentCtrl(taskId, userId, content);
        }),
    }),

    // ----- Update (own To-Do for members; admin/owner anytime) -----
    update_task_title: tool({
      description: "Modifier le titre d'une tâche.",
      inputSchema: z.object({
        taskId: z.string(),
        title: z.string().describe("Le nouveau titre"),
      }),
      execute: ({ taskId, title }) =>
        safe(async () => {
          await assertOwnTodoTask(taskId, userId);
          return await updateTaskTitleCtrl({
            id: taskId,
            title,
            currentUserId: userId,
          });
        }),
    }),

    update_task_description: tool({
      description: "Modifier la description d'une tâche (Markdown autorisé).",
      inputSchema: z.object({
        taskId: z.string(),
        description: z.string().describe("La nouvelle description"),
      }),
      execute: ({ taskId, description }) =>
        safe(async () => {
          await assertOwnTodoTask(taskId, userId);
          return await updateTaskDescriptionCtrl({
            id: taskId,
            description,
            currentUserId: userId,
          });
        }),
    }),

    update_task_priority: tool({
      description: "Modifier la priorité d'une tâche.",
      inputSchema: z.object({
        taskId: z.string(),
        priority: PRIORITY_ENUM.describe("La nouvelle priorité"),
      }),
      execute: ({ taskId, priority }) =>
        safe(async () => {
          await assertOwnTodoTask(taskId, userId);
          return await updateTaskPriorityCtrl({
            id: taskId,
            priority,
            currentUserId: userId,
          });
        }),
    }),

    update_task_due_date: tool({
      description:
        "Définir ou retirer la date d'échéance d'une tâche. Passe `dueDate` vide/null pour retirer.",
      inputSchema: z.object({
        taskId: z.string(),
        dueDate: z
          .string()
          .nullable()
          .optional()
          .describe("Date d'échéance ISO 8601, ou null pour retirer"),
      }),
      execute: ({ taskId, dueDate }) =>
        safe(async () => {
          await assertOwnTodoTask(taskId, userId);
          return await updateTaskDueDateCtrl({
            id: taskId,
            dueDate: parseDueDate(dueDate),
            currentUserId: userId,
          });
        }),
    }),

    update_task_status: tool({
      description:
        "Changer le statut d'une tâche (la déplacer de colonne). Réservé aux owner/admin.",
      inputSchema: z.object({
        taskId: z.string(),
        status: z.string().describe("Le nouveau statut/colonne (slug)"),
      }),
      execute: ({ taskId, status }) =>
        safe(async () => {
          const ctx = await assertWorkspaceTaskAccess(taskId, userId);
          await assertAdminWorkspaceRole(userId, ctx.workspaceId);
          return await updateTaskStatusCtrl({
            id: taskId,
            status,
            currentUserId: userId,
          });
        }),
    }),

    update_task_assignee: tool({
      description:
        "Assigner une tâche à un membre (ou désassigner avec assigneeId vide/null). Réservé aux owner/admin.",
      inputSchema: z.object({
        taskId: z.string(),
        assigneeId: z
          .string()
          .nullable()
          .optional()
          .describe("ID du membre, ou null/vide pour désassigner"),
      }),
      execute: ({ taskId, assigneeId }) =>
        safe(async () => {
          const ctx = await assertWorkspaceTaskAccess(taskId, userId);
          await assertAdminWorkspaceRole(userId, ctx.workspaceId);
          return await updateTaskAssigneeCtrl({
            id: taskId,
            userId: assigneeId ?? "",
            currentUserId: userId,
          });
        }),
    }),

    move_task: tool({
      description:
        "Déplacer une tâche vers un autre projet (statut optionnel). Réservé aux owner/admin.",
      inputSchema: z.object({
        taskId: z.string(),
        destinationProjectId: z
          .string()
          .describe("L'ID du projet de destination"),
        destinationStatus: z
          .string()
          .optional()
          .describe("Statut optionnel dans le projet de destination"),
      }),
      execute: ({ taskId, destinationProjectId, destinationStatus }) =>
        safe(async () => {
          const ctx = await assertWorkspaceTaskAccess(taskId, userId);
          await assertAdminWorkspaceRole(userId, ctx.workspaceId);
          return await moveTaskCtrl({
            taskId,
            destinationProjectId,
            destinationStatus,
            currentUserId: userId,
          });
        }),
    }),

    delete_task: tool({
      description:
        "Supprimer une tâche. Un membre ne peut supprimer que ses propres tâches To-Do.",
      inputSchema: z.object({
        taskId: z.string(),
      }),
      execute: ({ taskId }) =>
        safe(async () => {
          await assertOwnTodoTask(taskId, userId);
          return await deleteTaskCtrl(taskId, userId);
        }),
    }),

    // ----- Labels -----
    add_label_to_task: tool({
      description: "Ajouter un label (nom + couleur) à une tâche.",
      inputSchema: z.object({
        taskId: z.string(),
        name: z.string().describe("Le nom du label"),
        color: z
          .string()
          .optional()
          .describe("Couleur hex (ex: #6366f1). Défaut si omis."),
      }),
      execute: ({ taskId, name, color }) =>
        safe(async () => {
          const ctx = await assertOwnTodoTask(taskId, userId);
          return await createLabelCtrl(
            name,
            color || "#6366f1",
            taskId,
            ctx.workspaceId,
            userId,
          );
        }),
    }),

    remove_label_from_task: tool({
      description: "Retirer un label d'une tâche à partir de l'ID du label.",
      inputSchema: z.object({
        labelId: z.string().describe("L'ID du label à retirer"),
      }),
      execute: ({ labelId }) =>
        safe(async () => {
          const label = await db.query.labelTable.findFirst({
            where: eq(labelTable.id, labelId),
          });
          if (!label || !label.taskId) {
            throw new HTTPException(404, { message: "Label not found" });
          }
          await assertOwnTodoTask(label.taskId, userId);
          return await unassignLabelFromTaskCtrl(labelId, userId);
        }),
    }),

    // ----- Bulk (owner/admin only, enforced by the controller) -----
    bulk_update_tasks: tool({
      description:
        "Opération en masse sur plusieurs tâches (réservé owner/admin). Operations: updateStatus, updatePriority, updateAssignee, updateDueDate, addLabel, removeLabel, delete.",
      inputSchema: z.object({
        taskIds: z.array(z.string()).min(1).describe("Les IDs des tâches"),
        operation: z.enum([
          "updateStatus",
          "updatePriority",
          "updateAssignee",
          "updateDueDate",
          "addLabel",
          "removeLabel",
          "delete",
        ]),
        value: z
          .string()
          .nullable()
          .optional()
          .describe(
            "La valeur (statut, priorité, ID d'assigné, date ISO, nom de label). Non requis pour delete.",
          ),
      }),
      execute: ({ taskIds, operation, value }) =>
        safe(async () => {
          return await bulkUpdateTasksCtrl({
            taskIds,
            operation,
            value: value ?? undefined,
            userId,
          });
        }),
    }),
  };
}
