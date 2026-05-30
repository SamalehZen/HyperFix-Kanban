import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConversation } from "@/fetchers/ai/conversations";

export function useCreateConversation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title }: { title?: string } = {}) =>
      createConversation(workspaceId, title),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ai-conversations", workspaceId],
      });
    },
  });
}
