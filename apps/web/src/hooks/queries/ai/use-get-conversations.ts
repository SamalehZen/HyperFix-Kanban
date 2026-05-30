import { useQuery } from "@tanstack/react-query";
import { getConversations } from "@/fetchers/ai/conversations";

export function useGetConversations(workspaceId: string) {
  return useQuery({
    queryKey: ["ai-conversations", workspaceId],
    queryFn: () => getConversations(workspaceId),
    enabled: !!workspaceId,
  });
}
