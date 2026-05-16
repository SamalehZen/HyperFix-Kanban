import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  projectTable,
  taskTable,
  workspaceUserTable,
} from "../database/schema";

export type WorkspaceRole = "owner" | "admin" | "member" | null;

export const ADMIN_WORKSPACE_ROLES: ReadonlyArray<NonNullable<WorkspaceRole>> =
  ["owner", "admin"];

export const TODO_STATUS_SLUG = "to-do";

/**
 * Returns the role of `userId` in `workspaceId`, or null if the user is not a
 * member of that workspace. Roles are normalised to lowercase.
 */
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole> {
  if (!userId || !workspaceId) {
    return null;
  }

  const [membership] = await db
    .select({ role: workspaceUserTable.role })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, userId),
        eq(workspaceUserTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!membership) return null;
  const role = membership.role?.toLowerCase();
  if (role === "owner" || role === "admin" || role === "member") {
    return role;
  }
  return null;
}

/**
 * Throws an HTTPException (401 if not a member, 403 if role disallowed) when
 * the user's role is not in `allowedRoles`. Returns the role on success.
 */
export async function assertWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: ReadonlyArray<NonNullable<WorkspaceRole>>,
): Promise<NonNullable<WorkspaceRole>> {
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const role = await getWorkspaceRole(userId, workspaceId);

  if (!role) {
    throw new HTTPException(403, {
      message: "You don't have access to this workspace",
    });
  }

  if (!allowedRoles.includes(role)) {
    throw new HTTPException(403, {
      message: "Only the workspace owner or admin can perform this action",
    });
  }

  return role;
}

/**
 * Convenience helper restricting an action to workspace owner/admin.
 */
export async function assertAdminWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<NonNullable<WorkspaceRole>> {
  return assertWorkspaceRole(userId, workspaceId, ADMIN_WORKSPACE_ROLES);
}

export type TaskOwnershipContext = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  createdBy: string | null;
  assigneeId: string | null;
  status: string;
  role: NonNullable<WorkspaceRole>;
};

/**
 * Loads task + project + workspace + caller role and enforces the workflow
 * rule:
 *
 *   - Members can only mutate their own Todo tasks (`createdBy === userId &&
 *     status === "to-do"`).
 *   - Owners/admins always pass.
 *
 * Throws 401 if unauthenticated, 403 if not a workspace member or rule fails,
 * 404 if the task doesn't exist.
 */
export async function assertOwnTodoTask(
  taskId: string,
  userId: string,
): Promise<TaskOwnershipContext> {
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const [task] = await db
    .select({
      taskId: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
      createdBy: taskTable.createdBy,
      assigneeId: taskTable.userId,
      status: taskTable.status,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  const role = await getWorkspaceRole(userId, task.workspaceId);

  if (!role) {
    throw new HTTPException(403, {
      message: "You don't have access to this workspace",
    });
  }

  if (ADMIN_WORKSPACE_ROLES.includes(role)) {
    return { ...task, role };
  }

  if (task.createdBy !== userId || task.status !== TODO_STATUS_SLUG) {
    throw new HTTPException(403, {
      message: "You can edit only your own Todo tasks",
    });
  }

  return { ...task, role };
}

export async function assertWorkspaceTaskAccess(
  taskId: string,
  userId: string,
): Promise<TaskOwnershipContext> {
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const [task] = await db
    .select({
      taskId: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
      createdBy: taskTable.createdBy,
      assigneeId: taskTable.userId,
      status: taskTable.status,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  const role = await getWorkspaceRole(userId, task.workspaceId);

  if (!role) {
    throw new HTTPException(403, {
      message: "You don't have access to this workspace",
    });
  }

  return { ...task, role };
}

/**
 * Comma-separated, normalised (trimmed, lowercase) list of emails permitted
 * to create workspaces. Empty/unset means "no restriction" (default).
 */
export function getWorkspaceCreationAllowedEmails(): string[] {
  const raw = process.env.WORKSPACE_CREATION_ALLOWED_EMAILS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns true when the given email may create workspaces. When the
 * allow-list is empty/unset, all authenticated users may create workspaces.
 */
export function canEmailCreateWorkspace(email: string | null | undefined) {
  const allowed = getWorkspaceCreationAllowedEmails();
  if (allowed.length === 0) return true;
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}
