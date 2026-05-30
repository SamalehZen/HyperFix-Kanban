import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { aiConversationTable } from "../../database/schema";

export async function deleteConversation(
  conversationId: string,
  userId: string,
  workspaceId: string,
) {
  const [deleted] = await db
    .delete(aiConversationTable)
    .where(
      and(
        eq(aiConversationTable.id, conversationId),
        eq(aiConversationTable.userId, userId),
        eq(aiConversationTable.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  return { success: true };
}
export default deleteConversation;
