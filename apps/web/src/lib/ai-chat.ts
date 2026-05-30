import { DefaultChatTransport, type UIMessage } from "ai";
import { getApiUrl } from "@/fetchers/get-api-url";

/**
 * Extracts the rendered text of a UIMessage (AI SDK v6). Messages are made of
 * `parts`; text lives in `text` parts. `message.content` no longer exists.
 */
export function getMessageText(message: UIMessage): string {
  return (message.parts ?? [])
    .map((part) => (part.type === "text" && "text" in part ? part.text : ""))
    .join("");
}

/**
 * True when the (assistant) message has tool-call parts but no text yet — used
 * to show a "working…" indicator while the agent runs tools.
 */
export function hasToolActivity(message: UIMessage): boolean {
  return (message.parts ?? []).some(
    (part) =>
      part.type === "dynamic-tool" ||
      (typeof part.type === "string" && part.type.startsWith("tool-")),
  );
}

type ChatRequestBody = {
  workspaceId?: string;
  conversationId?: string | null;
  images?: string[];
};

/**
 * Shared transport for the AI assistant. Critical details for AI SDK v6:
 * - `credentials: "include"` so the Better Auth session cookie is sent
 *   cross-origin to the API.
 * - `prepareSendMessagesRequest` maps the chat state to the backend contract
 *   `{ message, conversationId, workspaceId, images }` (the server rebuilds
 *   history from the DB, so we only send the latest message).
 */
export function createChatTransport() {
  return new DefaultChatTransport<UIMessage>({
    api: getApiUrl("ai/chat"),
    credentials: "include",
    prepareSendMessagesRequest: ({ messages, body }) => {
      const last = messages[messages.length - 1];
      const text = last ? getMessageText(last) : "";
      const b = (body ?? {}) as ChatRequestBody;

      return {
        body: {
          message: text,
          workspaceId: b.workspaceId,
          conversationId: b.conversationId ?? undefined,
          images: b.images,
        },
      };
    },
  });
}
