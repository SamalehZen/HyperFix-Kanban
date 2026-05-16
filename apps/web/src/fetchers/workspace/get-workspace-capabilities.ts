import { client } from "@kaneo/libs";

export type WorkspaceCapabilities = {
  canCreateWorkspace: boolean;
};

async function getWorkspaceCapabilities(): Promise<WorkspaceCapabilities> {
  const response = await client.workspace.me.permissions.$get();

  if (!response.ok) {
    throw new Error(
      (await response.text()) || "Failed to fetch workspace capabilities",
    );
  }

  return response.json();
}

export default getWorkspaceCapabilities;
