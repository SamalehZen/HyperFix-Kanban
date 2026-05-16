import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

// Define custom permissions for workspace-specific resources
const statement = {
  ...defaultStatements, // Include default org/member/invitation permissions
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  workspace: ["read", "update", "delete", "manage_settings"],
  team: ["invite", "remove", "manage_roles"],
} as const;

const ac = createAccessControl(statement);

// Custom role definitions that extend default permissions.
// IMPORTANT: keep this in sync with apps/api/src/auth-permissions.ts so the
// server-side Better Auth checks return the same result as
// authClient.organization.checkRolePermission(...).
const member = ac.newRole({
  ...memberAc.statements, // Inherit default member permissions
  project: ["read"],
  task: ["create", "read"],
  workspace: ["read"],
  team: [],
});

const admin = ac.newRole({
  ...adminAc.statements, // Inherit default admin permissions
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  workspace: ["read", "update", "manage_settings"],
  team: ["invite", "remove", "manage_roles"],
});

const owner = ac.newRole({
  ...ownerAc.statements, // Inherit default owner permissions
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  workspace: ["read", "update", "delete", "manage_settings"],
  team: ["invite", "remove", "manage_roles"],
});

export { ac, admin, member, owner, statement };
