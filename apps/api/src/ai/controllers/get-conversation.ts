import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { aiConversationTable, aiMessageTable } from "../../database/schema";

export async function getConversation(
  conversationId: string,
  userId: string,
  workspaceId: string,
) {
  const [conversation] = await db
    .select()
    .from(aiConversationTable)
    .where(eq(aiConversationTable.id, conversationId))
    .limit(1);

  if (
    !conversation ||
    conversation.userId !== userId ||
    conversation.workspaceId !== workspaceId
  ) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  const messages = await db
    .select()
    .from(aiMessageTable)
    .where(eq(aiMessageTable.conversationId, conversationId))
    .orderBy(aiMessageTable.createdAt);

  // Return messages in the Vercel AI SDK v6 UIMessage shape (role + parts) so
  // the frontend `useChat` can render them directly on reload. Only user and
  // assistant text is surfaced; internal tool rows are skipped.
  return {
    ...conversation,
    messages: messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
        createdAt: m.createdAt,
      })),
  };
}
