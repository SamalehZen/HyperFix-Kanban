import db from "../../database";
import { aiConversationTable } from "../../database/schema";

export async function createConversation(
  userId: string,
  workspaceId: string,
  title?: string,
) {
  const [conversation] = await db
    .insert(aiConversationTable)
    .values({
      userId,
      workspaceId,
      title: title || "Nouvelle conversation",
    })
    .returning();

  return conversation;
}
