import { describe, expect, it, vi } from "vitest";

// Mock the permission layer so we can assert that write tools enforce it and
// that thrown HTTPExceptions are converted into structured tool results
// (instead of crashing the stream).
vi.mock("../../../apps/api/src/utils/workspace-role", () => ({
  ADMIN_WORKSPACE_ROLES: ["owner", "admin"],
  TODO_STATUS_SLUG: "to-do",
  assertWorkspaceRole: vi.fn(async () => "member"),
  assertAdminWorkspaceRole: vi.fn(async () => {
    const { HTTPException } = await import("hono/http-exception");
    throw new HTTPException(403, {
      message: "Only the workspace owner or admin can perform this action",
    });
  }),
  assertWorkspaceTaskAccess: vi.fn(async () => ({
    taskId: "task_1",
    projectId: "project_1",
    workspaceId: "workspace_1",
    createdBy: "user_1",
    assigneeId: null,
    status: "to-do",
    role: "member",
  })),
  assertOwnTodoTask: vi.fn(async () => {
    const { HTTPException } = await import("hono/http-exception");
    throw new HTTPException(403, {
      message: "You can edit only your own Todo tasks",
    });
  }),
}));

import { getSystemPrompt } from "../../../apps/api/src/ai/prompt";
import { getAiTools } from "../../../apps/api/src/ai/tools";

const EXPECTED_TOOLS = [
  "list_projects",
  "list_columns",
  "list_members",
  "list_labels",
  "list_tasks",
  "get_task",
  "search",
  "create_task",
  "create_comment",
  "update_task_title",
  "update_task_description",
  "update_task_priority",
  "update_task_due_date",
  "update_task_status",
  "update_task_assignee",
  "move_task",
  "delete_task",
  "add_label_to_task",
  "remove_label_from_task",
  "bulk_update_tasks",
] as const;

describe("getAiTools", () => {
  const tools = getAiTools("user_1");

  it("exposes the full assistant toolset", () => {
    expect(Object.keys(tools).sort()).toEqual([...EXPECTED_TOOLS].sort());
  });

  it("defines every tool with a v6 inputSchema and an execute handler", () => {
    for (const name of EXPECTED_TOOLS) {
      const def = tools[name as keyof typeof tools];
      expect(def, name).toBeDefined();
      // AI SDK v6 renamed `parameters` -> `inputSchema`; guard the regression.
      expect(
        (def as { inputSchema?: unknown }).inputSchema,
        name,
      ).toBeDefined();
      expect(typeof (def as { execute?: unknown }).execute, name).toBe(
        "function",
      );
    }
  });

  it("returns a structured error (not a throw) when a member lacks admin rights", async () => {
    const result = await tools.update_task_status.execute(
      { taskId: "task_1", status: "done" },
      {} as never,
    );
    expect(result).toMatchObject({ status: 403 });
    expect((result as { error: string }).error).toContain("admin");
  });

  it("returns a structured error when a member edits a task that is not their own Todo", async () => {
    const result = await tools.update_task_title.execute(
      { taskId: "task_1", title: "Nouveau titre" },
      {} as never,
    );
    expect((result as { error: string }).error).toContain("Todo");
  });
});

describe("getSystemPrompt", () => {
  const prompt = getSystemPrompt({
    workspaceId: "workspace_42",
    today: "2026-05-30",
  });

  it("injects the live workspace and date context", () => {
    expect(prompt).toContain("workspace_42");
    expect(prompt).toContain("2026-05-30");
  });

  it("documents permission boundaries and clarification behaviour", () => {
    expect(prompt).toContain("To-Do");
    expect(prompt.toLowerCase()).toContain("permission");
    expect(prompt.toLowerCase()).toContain("question");
    expect(prompt).toContain("owner/admin");
  });
});
