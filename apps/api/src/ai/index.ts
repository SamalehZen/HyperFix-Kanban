import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import * as v from "valibot";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { chat } from "./controllers/chat";
import { createConversation } from "./controllers/create-conversation";
import { deleteConversation } from "./controllers/delete-conversation";
import { getConversation } from "./controllers/get-conversation";
import { listConversations } from "./controllers/list-conversations";

const ai = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>();

// POST /api/ai/conversations
ai.post(
  "/conversations",
  describeRoute({
    operationId: "createConversation",
    tags: ["AI"],
    description: "Create a new AI conversation session.",
    responses: {
      200: {
        description: "Created conversation session",
      },
    },
  }),
  validator(
    "json",
    v.object({
      workspaceId: v.pipe(
        v.string(),
        v.minLength(1, "Workspace ID is required"),
      ),
      title: v.optional(v.string()),
    }),
  ),
  workspaceAccess.fromBody("workspaceId"),
  async (c) => {
    const userId = c.get("userId");
    const { workspaceId, title } = c.req.valid("json");
    const conversation = await createConversation(userId, workspaceId, title);
    return c.json(conversation);
  },
);

// POST /api/ai/chat
ai.post(
  "/chat",
  describeRoute({
    operationId: "aiChat",
    tags: ["AI"],
    description: "Send a message to the AI assistant and stream the response.",
    responses: {
      200: {
        description: "SSE Stream of AI response and tool calls.",
      },
    },
  }),
  validator(
    "json",
    v.object({
      message: v.pipe(
        v.string(),
        v.minLength(1, "Message must be at least 1 character"),
      ),
      conversationId: v.optional(v.string()),
      workspaceId: v.pipe(
        v.string(),
        v.minLength(1, "Workspace ID is required"),
      ),
      images: v.optional(v.array(v.string())),
    }),
  ),
  workspaceAccess.fromBody("workspaceId"),
  async (c) => {
    const userId = c.get("userId");
    const { message, conversationId, workspaceId, images } =
      c.req.valid("json");
    return await chat({ userId, workspaceId, conversationId, message, images });
  },
);

// GET /api/ai/conversations
ai.get(
  "/conversations",
  describeRoute({
    operationId: "listConversations",
    tags: ["AI"],
    description:
      "List all AI conversations for the current user in a workspace.",
    responses: {
      200: {
        description: "List of conversations",
      },
    },
  }),
  validator(
    "query",
    v.object({
      workspaceId: v.pipe(
        v.string(),
        v.minLength(1, "Workspace ID is required"),
      ),
    }),
  ),
  workspaceAccess.fromQuery("workspaceId"),
  async (c) => {
    const userId = c.get("userId");
    const { workspaceId } = c.req.valid("query");
    const conversations = await listConversations(userId, workspaceId);
    return c.json(conversations);
  },
);

// GET /api/ai/conversations/:id
ai.get(
  "/conversations/:id",
  describeRoute({
    operationId: "getConversation",
    tags: ["AI"],
    description: "Get a specific AI conversation with all its messages.",
    responses: {
      200: {
        description: "The conversation object with its messages",
      },
    },
  }),
  validator(
    "param",
    v.object({
      id: v.string(),
    }),
  ),
  validator(
    "query",
    v.object({
      workspaceId: v.pipe(
        v.string(),
        v.minLength(1, "Workspace ID is required"),
      ),
    }),
  ),
  workspaceAccess.fromQuery("workspaceId"),
  async (c) => {
    const userId = c.get("userId");
    const workspaceId = c.get("workspaceId");
    const { id } = c.req.valid("param");
    const conversation = await getConversation(id, userId, workspaceId);
    return c.json(conversation);
  },
);

// DELETE /api/ai/conversations/:id
ai.delete(
  "/conversations/:id",
  describeRoute({
    operationId: "deleteConversation",
    tags: ["AI"],
    description: "Delete a specific AI conversation.",
    responses: {
      200: {
        description: "Success indicator",
      },
    },
  }),
  validator(
    "param",
    v.object({
      id: v.string(),
    }),
  ),
  validator(
    "query",
    v.object({
      workspaceId: v.pipe(
        v.string(),
        v.minLength(1, "Workspace ID is required"),
      ),
    }),
  ),
  workspaceAccess.fromQuery("workspaceId"),
  async (c) => {
    const userId = c.get("userId");
    const workspaceId = c.get("workspaceId");
    const { id } = c.req.valid("param");
    const result = await deleteConversation(id, userId, workspaceId);
    return c.json(result);
  },
);

export default ai;
