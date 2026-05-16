import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

async function seedMemberAndProject(role: "owner" | "admin" | "member") {
  const ws = await createWorkspaceMember({ role });
  const { project, columns } = await createProjectFixture({
    workspaceId: ws.workspace.id,
  });
  return { user: ws.user, workspace: ws.workspace, project, columns };
}

describe("API integration: member workflow restrictions", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("allows a member to create a Todo task and stamps createdBy with the member id", async () => {
    const ctx = await seedMemberAndProject("member");
    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/${ctx.project.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Branch submission",
        description: "Product photo upload",
        priority: "medium",
        status: "to-do",
      }),
    });

    expect(response.status).toBe(200);
    const created = (await response.json()) as {
      id: string;
      status: string;
      createdBy: string | null;
      userId: string | null;
    };
    expect(created.status).toBe("to-do");
    expect(created.createdBy).toBe(ctx.user.id);
    // Members may not assign other users — assignee is forced to creator.
    expect(created.userId).toBe(ctx.user.id);

    const persisted = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, created.id),
    });
    expect(persisted?.createdBy).toBe(ctx.user.id);
  });

  it("forces a member's task assignee to themselves even when they POST a different userId", async () => {
    const ctx = await seedMemberAndProject("member");
    const otherId = `user-${randomUUID()}`;
    const [other] = await db
      .insert(schema.userTable)
      .values({
        id: otherId,
        email: `${otherId}@example.com`,
        emailVerified: true,
        name: "Other user",
      })
      .returning();
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: ctx.workspace.id,
      userId: other.id,
      role: "member",
      joinedAt: new Date(),
    });

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/${ctx.project.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Should self-assign",
        description: "",
        priority: "low",
        status: "to-do",
        userId: other.id,
      }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      userId: string | null;
      createdBy: string | null;
    };
    expect(payload.userId).toBe(ctx.user.id);
    expect(payload.createdBy).toBe(ctx.user.id);
  });

  it("rejects member task creation in non-Todo columns", async () => {
    const ctx = await seedMemberAndProject("member");
    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/${ctx.project.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Branch in-progress",
        description: "",
        priority: "medium",
        status: "in-progress",
      }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks members from editing tasks they did not create", async () => {
    const ctx = await seedMemberAndProject("member");
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.project.id,
        userId: ctx.user.id,
        createdBy: null,
        title: "Historical task",
        description: "",
        status: "to-do",
        columnId: ctx.columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/title/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Hijacked" }),
    });

    expect(response.status).toBe(403);
  });

  it("lets a member update their own Todo task title", async () => {
    const ctx = await seedMemberAndProject("member");
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.project.id,
        userId: ctx.user.id,
        createdBy: ctx.user.id,
        title: "Member's Todo",
        description: "",
        status: "to-do",
        columnId: ctx.columns.todo.id,
        priority: "low",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/title/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    expect(response.status).toBe(200);
    const after = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    });
    expect(after?.title).toBe("Updated");
  });

  it("blocks members from editing their task once it is moved out of Todo", async () => {
    const ctx = await seedMemberAndProject("member");
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.project.id,
        userId: ctx.user.id,
        createdBy: ctx.user.id,
        title: "Member's Todo",
        description: "",
        status: "in-progress",
        columnId: ctx.columns.inProgress.id,
        priority: "low",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/title/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Cannot edit" }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks members from changing the status of their own task", async () => {
    const ctx = await seedMemberAndProject("member");
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.project.id,
        userId: ctx.user.id,
        createdBy: ctx.user.id,
        title: "Member's Todo",
        description: "",
        status: "to-do",
        columnId: ctx.columns.todo.id,
        priority: "low",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/status/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "in-progress" }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks members from changing assignee of their own task", async () => {
    const ctx = await seedMemberAndProject("member");
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.project.id,
        userId: ctx.user.id,
        createdBy: ctx.user.id,
        title: "Member's Todo",
        description: "",
        status: "to-do",
        columnId: ctx.columns.todo.id,
        priority: "low",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/assignee/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "" }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks members from cross-project moves", async () => {
    const ctx = await seedMemberAndProject("member");
    const { project: otherProject } = await createProjectFixture({
      workspaceId: ctx.workspace.id,
      name: "Other",
      slug: "other",
    });
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.project.id,
        userId: ctx.user.id,
        createdBy: ctx.user.id,
        title: "Member's Todo",
        description: "",
        status: "to-do",
        columnId: ctx.columns.todo.id,
        priority: "low",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const response = await app.request(`/api/task/move/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        destinationProjectId: otherProject.id,
      }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks members from creating columns, workflow rules, label definitions", async () => {
    const ctx = await seedMemberAndProject("member");
    mockAuthenticatedSession(ctx.user);
    const { app } = createApp();

    const columnRes = await app.request(`/api/column/${ctx.project.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Extra" }),
    });
    expect(columnRes.status).toBe(403);

    const labelRes = await app.request("/api/label", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Definition",
        color: "#10b981",
        workspaceId: ctx.workspace.id,
      }),
    });
    expect(labelRes.status).toBe(403);

    const projectMutationRes = await app.request(
      `/api/project/${ctx.project.id}/archive`,
      {
        method: "PUT",
      },
    );
    expect(projectMutationRes.status).toBe(403);
  });

  it("allows owners/admins to perform mutations members cannot", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const { project, columns } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });

    const [memberTask] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: owner.user.id,
        createdBy: null,
        title: "Historical",
        description: "",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(owner.user);
    const { app } = createApp();

    const titleRes = await app.request(`/api/task/title/${memberTask.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Owner edited" }),
    });
    expect(titleRes.status).toBe(200);

    const statusRes = await app.request(`/api/task/status/${memberTask.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "in-progress" }),
    });
    expect(statusRes.status).toBe(200);

    const after = await db.query.taskTable.findFirst({
      where: and(
        eq(schema.taskTable.id, memberTask.id),
        eq(schema.taskTable.status, "in-progress"),
      ),
    });
    expect(after).toBeDefined();
  });

  it("exposes WORKSPACE_CREATION_ALLOWED_EMAILS capability via /workspace/me/permissions", async () => {
    const allowed = await createWorkspaceMember({ role: "owner" });
    process.env.WORKSPACE_CREATION_ALLOWED_EMAILS = allowed.user.email;

    mockAuthenticatedSession(allowed.user);
    const { app: allowedApp } = createApp();
    const allowedRes = await allowedApp.request(
      "/api/workspace/me/permissions",
    );
    expect(allowedRes.status).toBe(200);
    expect(await allowedRes.json()).toEqual({ canCreateWorkspace: true });

    const blocked = await createWorkspaceMember({ role: "owner" });
    mockAuthenticatedSession(blocked.user);
    const { app: blockedApp } = createApp();
    const blockedRes = await blockedApp.request(
      "/api/workspace/me/permissions",
    );
    expect(blockedRes.status).toBe(200);
    expect(await blockedRes.json()).toEqual({ canCreateWorkspace: false });

    delete process.env.WORKSPACE_CREATION_ALLOWED_EMAILS;
    mockAuthenticatedSession(blocked.user);
    const { app: defaultApp } = createApp();
    const defaultRes = await defaultApp.request(
      "/api/workspace/me/permissions",
    );
    expect(defaultRes.status).toBe(200);
    expect(await defaultRes.json()).toEqual({ canCreateWorkspace: true });
  });
});
