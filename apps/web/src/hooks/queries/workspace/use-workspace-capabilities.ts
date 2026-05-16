import { useQuery } from "@tanstack/react-query";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import getWorkspaceCapabilities from "@/fetchers/workspace/get-workspace-capabilities";

function useWorkspaceCapabilities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace-capabilities", user?.id],
    enabled: !!user?.id,
    queryFn: getWorkspaceCapabilities,
    staleTime: 60_000,
  });
}

export default useWorkspaceCapabilities;
