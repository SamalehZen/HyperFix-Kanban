import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation } from "@/fetchers/ai/conversations";

export function useDeleteConversation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id, workspaceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ai-conversations", workspaceId],
      });
    },
  });
}
