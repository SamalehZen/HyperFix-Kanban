import { and, desc, eq } from "drizzle-orm";
import db from "../../database";
import { aiConversationTable } from "../../database/schema";

export async function listConversations(userId: string, workspaceId: string) {
  const conversations = await db
    .select()
    .from(aiConversationTable)
    .where(
      and(
        eq(aiConversationTable.userId, userId),
        eq(aiConversationTable.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(aiConversationTable.updatedAt));

  return conversations;
}
