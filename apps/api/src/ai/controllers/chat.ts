import { type ModelMessage, stepCountIs, streamText } from "ai";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { aiConversationTable, aiMessageTable } from "../../database/schema";
import { getSystemPrompt } from "../prompt";
import { getModel } from "../provider";
import { getAiTools } from "../tools";

type ImagePart = { type: "image"; image: string | URL };
type TextPart = { type: "text"; text: string };

function toImagePart(src: string): ImagePart {
  // Accept absolute http(s) URLs and data URLs; pass through to the model.
  if (/^https?:\/\//i.test(src)) {
    return { type: "image", image: new URL(src) };
  }
  return { type: "image", image: src };
}

export async function chat({
  userId,
  workspaceId,
  conversationId,
  message,
  images,
}: {
  userId: string;
  workspaceId: string;
  conversationId?: string;
  message: string;
  images?: string[];
}) {
  // 1. Resolve (and authorize) or create the conversation.
  const convId = await resolveConversationId({
    conversationId,
    userId,
    workspaceId,
    message,
  });

  // 2. Persist the user message.
  await db.insert(aiMessageTable).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  // 3. Load the conversation transcript (user/assistant text only) and convert
  //    it into Vercel AI SDK ModelMessages. Tool-call rows are intentionally
  //    not replayed as model input to keep the transcript valid and robust.
  const rawHistory = await db
    .select()
    .from(aiMessageTable)
    .where(eq(aiMessageTable.conversationId, convId))
    .orderBy(aiMessageTable.createdAt);

  const textHistory = rawHistory.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  const messages: ModelMessage[] = textHistory.map((m, index) => {
    const isLastUser = index === textHistory.length - 1 && m.role === "user";

    if (isLastUser && images && images.length > 0) {
      const parts: Array<TextPart | ImagePart> = [
        { type: "text", text: m.content },
        ...images.map(toImagePart),
      ];
      return { role: "user", content: parts } as ModelMessage;
    }

    return {
      role: m.role as "user" | "assistant",
      content: m.content,
    } as ModelMessage;
  });

  // 4. Stream the response with recursive tool-calling (multi-step).
  const result = streamText({
    model: getModel(),
    system: getSystemPrompt({
      workspaceId,
      today: new Date().toISOString().slice(0, 10),
    }),
    messages,
    tools: getAiTools(userId),
    stopWhen: stepCountIs(8),
    onError: ({ error }) => {
      console.error("AI chat stream error:", error);
    },
    onFinish: async ({ text, steps }) => {
      const finalText = text?.trim();
      let contentToSave = finalText ?? "";
      if (!contentToSave) {
        const usedTools = steps?.some((s) => s.toolCalls.length > 0);
        contentToSave = usedTools ? "✅ Action(s) effectuée(s)." : "";
      }

      if (contentToSave) {
        await db.insert(aiMessageTable).values({
          conversationId: convId,
          role: "assistant",
          content: contentToSave,
        });
      }

      // Bump conversation so it sorts to the top of the recent list.
      await db
        .update(aiConversationTable)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversationTable.id, convId));
    },
  });

  // 5. Return the UI message stream (AI SDK v6) with the conversation id header.
  return result.toUIMessageStreamResponse({
    headers: {
      "X-Conversation-Id": convId,
      "Access-Control-Expose-Headers": "X-Conversation-Id",
    },
    onError: (error) => {
      if (error instanceof HTTPException) return error.message;
      if (error instanceof Error) return error.message;
      return "Une erreur est survenue avec l'assistant IA.";
    },
  });
}

async function resolveConversationId({
  conversationId,
  userId,
  workspaceId,
  message,
}: {
  conversationId?: string;
  userId: string;
  workspaceId: string;
  message: string;
}): Promise<string> {
  if (conversationId) {
    const [existing] = await db
      .select()
      .from(aiConversationTable)
      .where(eq(aiConversationTable.id, conversationId))
      .limit(1);

    if (
      !existing ||
      existing.userId !== userId ||
      existing.workspaceId !== workspaceId
    ) {
      throw new HTTPException(404, { message: "Conversation not found" });
    }
    return conversationId;
  }

  const title =
    message.slice(0, 50) + (message.length > 50 ? "..." : "") ||
    "Nouvelle conversation";

  const [conv] = await db
    .insert(aiConversationTable)
    .values({
      userId,
      workspaceId,
      title,
    })
    .returning();

  if (!conv) {
    throw new HTTPException(500, {
      message: "Failed to create conversation",
    });
  }

  return conv.id;
}
