import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Deterministic mock model. Each chat() call gets a fresh model; the model's
// doStream returns the next queued chunk sequence (one per agent step).
const shared = vi.hoisted(() => ({ queue: [] as unknown[][] }));

vi.mock("../../apps/api/src/ai/provider", async () => {
  const test = await import("ai/test");
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 5, text: 5, reasoning: 0 },
    raw: undefined,
  };
  const fallback = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "0" },
    { type: "text-delta", id: "0", delta: "" },
    { type: "text-end", id: "0" },
    { type: "finish", finishReason: "stop", usage },
  ];
  return {
    isAiConfigured: () => true,
    getModel: () =>
      new test.MockLanguageModelV3({
        doStream: async () => {
          const chunks = shared.queue.shift() ?? fallback;
          return {
            stream: test.simulateReadableStream({
              chunks: chunks as never,
            }),
          };
        },
      }),
  };
});

import db, { schema } from "../../apps/api/src/database";
import { aiMessageTable } from "../../apps/api/src/database/schema";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
  raw: undefined,
};

function textChunks(text: string) {
  return [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "1" },
    { type: "text-delta", id: "1", delta: text },
    { type: "text-end", id: "1" },
    { type: "finish", finishReason: "stop", usage: USAGE },
  ];
}

function toolCallChunks(toolName: string, input: unknown) {
  return [
    { type: "stream-start", warnings: [] },
    {
      type: "tool-call",
      toolCallId: `tc_${toolName}`,
      toolName,
      input: JSON.stringify(input),
    },
    { type: "finish", finishReason: "tool-calls", usage: USAGE },
  ];
}

async function waitFor<T>(
  fn: () => Promise<T | null | undefined>,
  { tries = 40, delayMs = 50 } = {},
): Promise<T> {
  for (let i = 0; i < tries; i++) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("waitFor: condition not met in time");
}

function postChat(app: ReturnType<typeof createApp>["app"], body: unknown) {
  return app.request("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API integration: AI assistant chat (AI SDK v6)", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    shared.queue = [];
  });

  it("streams a text answer and persists the user + assistant turn", async () => {
    const ws = await createWorkspaceMember({ role: "owner" });
    mockAuthenticatedSession(ws.user);
    shared.queue = [textChunks("Bonjour ! Comment puis-je vous aider ?")];

    const { app } = createApp();
    const res = await postChat(app, {
      message: "Salut",
      workspaceId: ws.workspace.id,
    });

    expect(res.status).toBe(200);
    const conversationId = res.headers.get("X-Conversation-Id");
    expect(conversationId).toBeTruthy();

    const streamed = await res.text();
    expect(streamed).toContain("Bonjour");

    const messages = await waitFor(async () => {
      const rows = await db
        .select()
        .from(aiMessageTable)
        .where(eq(aiMessageTable.conversationId, conversationId as string))
        .orderBy(aiMessageTable.createdAt);
      return rows.length >= 2 ? rows : null;
    });

    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[0].content).toBe("Salut");
    expect(messages[1].content).toContain("Bonjour");
  });

  it("executes a create_task tool call end-to-end and persists the task", async () => {
    const ws = await createWorkspaceMember({ role: "owner" });
    const { project } = await createProjectFixture({
      workspaceId: ws.workspace.id,
    });
    mockAuthenticatedSession(ws.user);

    shared.queue = [
      toolCallChunks("create_task", {
        projectId: project.id,
        title: "Acheter du café",
        status: "to-do",
        priority: "medium",
      }),
      textChunks("J'ai créé la tâche « Acheter du café »."),
    ];

    const { app } = createApp();
    const res = await postChat(app, {
      message: "Crée une tâche pour acheter du café",
      workspaceId: ws.workspace.id,
    });
    expect(res.status).toBe(200);
    await res.text();

    const task = await waitFor(async () => {
      const [row] = await db
        .select()
        .from(schema.taskTable)
        .where(
          and(
            eq(schema.taskTable.projectId, project.id),
            eq(schema.taskTable.title, "Acheter du café"),
          ),
        )
        .limit(1);
      return row ?? null;
    });

    expect(task.status).toBe("to-do");
    expect(task.priority).toBe("medium");
    expect(task.createdBy).toBe(ws.user.id);
  });

  it("enforces permissions: a member cannot change task status via a tool call", async () => {
    const ws = await createWorkspaceMember({ role: "member" });
    const { project } = await createProjectFixture({
      workspaceId: ws.workspace.id,
    });
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        title: "Tâche du membre",
        status: "to-do",
        priority: "low",
        createdBy: ws.user.id,
        userId: ws.user.id,
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(ws.user);
    shared.queue = [
      toolCallChunks("update_task_status", {
        taskId: task.id,
        status: "done",
      }),
      textChunks("Désolé, seuls les owner/admin peuvent changer le statut."),
    ];

    const { app } = createApp();
    const res = await postChat(app, {
      message: "Passe ma tâche en done",
      workspaceId: ws.workspace.id,
    });
    expect(res.status).toBe(200);
    await res.text();

    // Give any (incorrect) async write a chance to land, then assert no change.
    await new Promise((r) => setTimeout(r, 300));
    const [after] = await db
      .select()
      .from(schema.taskTable)
      .where(eq(schema.taskTable.id, task.id))
      .limit(1);
    expect(after.status).toBe("to-do");
  });
});
