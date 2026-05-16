import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import db from "../database";
import { labelTable, projectTable, taskTable } from "../database/schema";
import { labelSchema } from "../schemas";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  ADMIN_WORKSPACE_ROLES,
  assertAdminWorkspaceRole,
  assertOwnTodoTask,
  assertWorkspaceRole,
  getWorkspaceRole,
  TODO_STATUS_SLUG,
} from "../utils/workspace-role";
import assignLabelToTask from "./controllers/assign-label-to-task";
import createLabel from "./controllers/create-label";
import deleteLabel from "./controllers/delete-label";
import getLabel from "./controllers/get-label";
import getLabelsByTaskId from "./controllers/get-labels-by-task-id";
import getLabelsByWorkspaceId from "./controllers/get-labels-by-workspace-id";
import unassignLabelFromTask from "./controllers/unassign-label-from-task";
import updateLabel from "./controllers/update-label";

const label = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .get(
    "/task/:taskId",
    describeRoute({
      operationId: "getTaskLabels",
      tags: ["Labels"],
      description: "Get all labels assigned to a specific task",
      responses: {
        200: {
          description: "List of labels for the task",
          content: {
            "application/json": { schema: resolver(v.array(labelSchema)) },
          },
        },
      },
    }),
    validator("param", v.object({ taskId: v.string() })),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const labels = await getLabelsByTaskId(taskId);
      return c.json(labels);
    },
  )
  .get(
    "/workspace/:workspaceId",
    describeRoute({
      operationId: "getWorkspaceLabels",
      tags: ["Labels"],
      description: "Get all labels for a specific workspace",
      responses: {
        200: {
          description: "List of labels in the workspace",
          content: {
            "application/json": { schema: resolver(v.array(labelSchema)) },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam(),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const labels = await getLabelsByWorkspaceId(workspaceId);
      return c.json(labels);
    },
  )
  .post(
    "/",
    describeRoute({
      operationId: "createLabel",
      tags: ["Labels"],
      description: "Create a new label in a workspace",
      responses: {
        200: {
          description: "Label created successfully",
          content: {
            "application/json": { schema: resolver(labelSchema) },
          },
        },
      },
    }),
    validator(
      "json",
      v.object({
        name: v.string(),
        color: v.string(),
        workspaceId: v.string(),
        taskId: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromBody(),
    async (c) => {
      const { name, color, workspaceId, taskId } = c.req.valid("json");
      const userId = c.get("userId");

      // Members may only attach an existing label-like row to their own Todo
      // task. Creating workspace-level label definitions stays admin-only.
      if (!taskId) {
        await assertAdminWorkspaceRole(userId, workspaceId);
      } else {
        const taskContext = await assertOwnTodoTask(taskId, userId);
        if (taskContext.workspaceId !== workspaceId) {
          throw new HTTPException(400, {
            message: "Label and task must belong to the same workspace",
          });
        }
      }

      const label = await createLabel(name, color, taskId, workspaceId, userId);
      return c.json(label);
    },
  )
  .get(
    "/:id",
    describeRoute({
      operationId: "getLabel",
      tags: ["Labels"],
      description: "Get a specific label by ID",
      responses: {
        200: {
          description: "Label details",
          content: {
            "application/json": { schema: resolver(labelSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromLabel(),
    async (c) => {
      const { id } = c.req.valid("param");
      const label = await getLabel(id);
      return c.json(label);
    },
  )
  .put(
    "/:id/task",
    describeRoute({
      operationId: "attachLabelToTask",
      tags: ["Labels"],
      description: "Attach an existing label to a task",
      responses: {
        200: {
          description: "Label attached to task successfully",
          content: {
            "application/json": { schema: resolver(labelSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator("json", v.object({ taskId: v.string() })),
    workspaceAccess.fromLabel(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { taskId } = c.req.valid("json");
      const userId = c.get("userId");

      const label = await db.query.labelTable.findFirst({
        where: eq(labelTable.id, id),
      });
      if (!label) {
        throw new HTTPException(404, { message: "Label not found" });
      }

      const [task] = await db
        .select({
          id: taskTable.id,
          workspaceId: projectTable.workspaceId,
          createdBy: taskTable.createdBy,
          status: taskTable.status,
        })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(eq(taskTable.id, taskId))
        .limit(1);
      if (!task) {
        throw new HTTPException(404, { message: "Task not found" });
      }

      if (label.workspaceId && label.workspaceId !== task.workspaceId) {
        throw new HTTPException(400, {
          message: "Label and task must belong to the same workspace",
        });
      }

      const role = await getWorkspaceRole(userId, task.workspaceId);
      if (!role) {
        throw new HTTPException(403, {
          message: "You don't have access to this workspace",
        });
      }

      if (!ADMIN_WORKSPACE_ROLES.includes(role)) {
        if (task.createdBy !== userId || task.status !== TODO_STATUS_SLUG) {
          throw new HTTPException(403, {
            message: "You can edit only your own Todo tasks",
          });
        }
        if (label.taskId && label.taskId !== taskId) {
          // Would steal a label from another task — disallowed for members.
          throw new HTTPException(403, {
            message: "You can edit only your own Todo tasks",
          });
        }
      }

      const updated = await assignLabelToTask(id, taskId, userId);
      return c.json(updated);
    },
  )
  .delete(
    "/:id/task",
    describeRoute({
      operationId: "detachLabelFromTask",
      tags: ["Labels"],
      description: "Detach a label from its current task",
      responses: {
        200: {
          description: "Label detached from task successfully",
          content: {
            "application/json": { schema: resolver(labelSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromLabel(),
    async (c) => {
      const { id } = c.req.valid("param");
      const userId = c.get("userId");

      const label = await db.query.labelTable.findFirst({
        where: eq(labelTable.id, id),
      });
      if (!label) {
        throw new HTTPException(404, { message: "Label not found" });
      }

      const workspaceId = c.get("workspaceId");
      const role = await assertWorkspaceRole(userId, workspaceId, [
        "owner",
        "admin",
        "member",
      ]);

      if (!ADMIN_WORKSPACE_ROLES.includes(role)) {
        if (!label.taskId) {
          // No-op detach of a workspace-level definition — admin only.
          throw new HTTPException(403, {
            message: "You can edit only your own Todo tasks",
          });
        }
        await assertOwnTodoTask(label.taskId, userId);
      }

      const updated = await unassignLabelFromTask(id, userId);
      return c.json(updated);
    },
  )
  .put(
    "/:id",
    describeRoute({
      operationId: "updateLabel",
      tags: ["Labels"],
      description: "Update an existing label",
      responses: {
        200: {
          description: "Label updated successfully",
          content: {
            "application/json": { schema: resolver(labelSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator(
      "json",
      v.object({
        name: v.string(),
        color: v.string(),
      }),
    ),
    workspaceAccess.fromLabel(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name, color } = c.req.valid("json");
      await assertAdminWorkspaceRole(c.get("userId"), c.get("workspaceId"));
      const label = await updateLabel(id, name, color);
      return c.json(label);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      operationId: "deleteLabel",
      tags: ["Labels"],
      description: "Delete a label by ID",
      responses: {
        200: {
          description: "Label deleted successfully",
          content: {
            "application/json": { schema: resolver(labelSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromLabel(),
    async (c) => {
      const { id } = c.req.valid("param");
      const userId = c.get("userId");
      await assertAdminWorkspaceRole(userId, c.get("workspaceId"));
      const label = await deleteLabel(id, userId);
      return c.json(label);
    },
  );

export default label;
