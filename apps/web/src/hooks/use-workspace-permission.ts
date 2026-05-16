import { useMemo } from "react";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useGetActiveWorkspaceUser } from "@/hooks/queries/workspace-users/use-active-workspace-user";
import { authClient } from "@/lib/auth-client";

export type PermissionLevel = "owner" | "admin" | "member";

type TaskOwnership = {
  status?: string | null;
  createdBy?: string | null;
};

export function useWorkspacePermission() {
  const { data: activeWorkspace } = useActiveWorkspace();
  const { data: activeMember } = useGetActiveWorkspaceUser();
  const { user } = useAuth();

  const permissionCheckers = useMemo(() => {
    const role = activeMember?.role as PermissionLevel | undefined;
    const isAdmin = role === "owner" || role === "admin";
    const isOwner = role === "owner";
    const isMember = role === "member";
    const currentUserId = user?.id ?? null;

    const canEditTask = (task?: TaskOwnership | null) => {
      if (!task) return false;
      if (isAdmin) return true;
      if (!isMember || !currentUserId) return false;
      return task.createdBy === currentUserId && task.status === "to-do";
    };

    return {
      // Server-side permission checking (most secure)
      async hasPermission(permissions: Record<string, string[]>) {
        try {
          const result = await authClient.organization.hasPermission({
            permissions,
          });
          return result.data || false;
        } catch (error) {
          console.error("Permission check failed:", error);
          return false;
        }
      },

      // Client-side role-based checking (faster for UI)
      checkRolePermission(permissions: Record<string, string[]>) {
        if (!role) return false;
        try {
          return authClient.organization.checkRolePermission({
            permissions,
            role,
          });
        } catch (error) {
          console.error("Role permission check failed:", error);
          return false;
        }
      },

      // Convenience methods for common checks
      canManageProjects() {
        return this.checkRolePermission({
          project: ["create", "update", "delete"],
        });
      },

      canCreateProjects() {
        return this.checkRolePermission({ project: ["create"] });
      },

      canManageTasks() {
        return this.checkRolePermission({
          task: ["create", "update", "delete"],
        });
      },

      canAssignTasks() {
        return this.checkRolePermission({ task: ["assign"] });
      },

      canManageWorkspace() {
        return this.checkRolePermission({
          workspace: ["update", "manage_settings"],
        });
      },

      canDeleteWorkspace() {
        return this.checkRolePermission({ workspace: ["delete"] });
      },

      canInviteUsers() {
        return this.checkRolePermission({ team: ["invite"] });
      },

      canManageTeam() {
        return this.checkRolePermission({ team: ["remove", "manage_roles"] });
      },

      canRemoveMembers() {
        return this.checkRolePermission({ team: ["remove"] });
      },

      // Members may only create tasks in the Todo column. Admins always pass.
      canCreateTaskInStatus(status?: string | null) {
        if (isAdmin) return true;
        if (!isMember) return false;
        return status === "to-do";
      },

      // True for admins or for members on their own Todo tasks.
      canEditTask,

      // True for admins or workspace members commenting on accessible tasks.
      canCommentOnTask(task?: TaskOwnership | null) {
        if (!task) return false;
        return isAdmin || isMember;
      },

      // Members never change assignee. Admins can.
      canChangeAssignee() {
        return isAdmin;
      },

      // Cross-project moves, column moves, status changes are admin only.
      canMoveTask() {
        return isAdmin;
      },

      // Status select on a card is admin-only.
      canChangeStatus() {
        return isAdmin;
      },

      // Project-level mutations (create/edit/delete/archive/settings) admin only.
      canMutateProject() {
        return isAdmin;
      },

      // Column editor / workflow editor / integration settings are admin only.
      canConfigureProject() {
        return isAdmin;
      },

      // Define/update/delete label catalog rows. Members can only attach
      // existing labels to their own Todo task.
      canManageLabels() {
        return isAdmin;
      },

      // Legacy compatibility method
      checkPermission(requiredRole: PermissionLevel = "member"): boolean {
        if (!activeWorkspace || !activeMember) return false;

        const userRole = activeMember.role as PermissionLevel;

        if (requiredRole === "owner") {
          return userRole === "owner";
        }

        if (requiredRole === "admin") {
          return ["owner", "admin"].includes(userRole);
        }

        // For member level, all roles have access
        return ["owner", "admin", "member"].includes(userRole);
      },

      isOwner,
      isAdmin,
      isMember,
      role,
      currentUserId,
    };
  }, [activeMember, activeWorkspace, user?.id]);

  return {
    ...permissionCheckers,
    workspace: activeWorkspace,
    member: activeMember,
  };
}
