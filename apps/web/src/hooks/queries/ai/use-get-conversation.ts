import { useQuery } from "@tanstack/react-query";
import { getConversation } from "@/fetchers/ai/conversations";

export function useGetConversation(
  conversationId: string | null,
  workspaceId: string,
) {
  return useQuery({
    queryKey: ["ai-conversation", conversationId, workspaceId],
    queryFn: () => {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      return getConversation(conversationId, workspaceId);
    },
    enabled: !!conversationId && !!workspaceId,
  });
}
