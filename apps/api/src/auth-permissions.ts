import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * Server-side Better Auth access-control definitions for the organization
 * plugin. This is intentionally kept in sync with
 * apps/web/src/lib/permissions.ts so the frontend's
 * `authClient.organization.checkRolePermission(...)` calls return the same
 * result as the server's enforcement.
 *
 * Backend Hono routes do NOT rely on this for authorization (see the
 * `workspace-role` helpers for that) — this exists so the Better Auth
 * organization endpoints (invite, remove member, change role, etc.) reject
 * member callers without us having to handcraft hooks for each verb.
 */
const statement = {
  ...defaultStatements,
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  workspace: ["read", "update", "delete", "manage_settings"],
  team: ["invite", "remove", "manage_roles"],
} as const;

export const ac = createAccessControl(statement);

export const member = ac.newRole({
  ...memberAc.statements,
  project: ["read"],
  task: ["create", "read"],
  workspace: ["read"],
  team: [],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  workspace: ["read", "update", "manage_settings"],
  team: ["invite", "remove", "manage_roles"],
});

export const owner = ac.newRole({
  ...ownerAc.statements,
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  workspace: ["read", "update", "delete", "manage_settings"],
  team: ["invite", "remove", "manage_roles"],
});

export const roles = { member, admin, owner } as const;
