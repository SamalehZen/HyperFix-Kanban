import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import db, { schema } from "../database";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { canEmailCreateWorkspace } from "../utils/workspace-role";
import getWorkspaceMembersCtrl from "./controllers/get-workspace-members";

const workspace = new Hono<{
  Variables: {
    userId: string;
    userEmail: string;
    workspaceId: string;
  };
}>()
  .get(
    "/me/permissions",
    describeRoute({
      operationId: "getWorkspaceCapabilities",
      tags: ["Workspaces"],
      description:
        "Per-user workspace capability flags (e.g. whether the caller may create new workspaces based on the WORKSPACE_CREATION_ALLOWED_EMAILS env)",
      responses: {
        200: {
          description: "Per-user workspace capability flags",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  canCreateWorkspace: v.boolean(),
                }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      const userId = c.get("userId");
      let email = c.get("userEmail");

      if (!email && userId) {
        const [user] = await db
          .select({ email: schema.userTable.email })
          .from(schema.userTable)
          .where(eq(schema.userTable.id, userId))
          .limit(1);
        email = user?.email ?? "";
      }

      return c.json({
        canCreateWorkspace: canEmailCreateWorkspace(email),
      });
    },
  )
  .get(
    "/:workspaceId/members",
    describeRoute({
      operationId: "getWorkspaceMembers",
      tags: ["Workspaces"],
      description: "Get all members of a workspace",
      responses: {
        200: {
          description: "List of workspace members",
          content: {
            "application/json": {
              schema: resolver(
                v.array(
                  v.object({
                    id: v.string(),
                    name: v.string(),
                    email: v.string(),
                    image: v.nullable(v.string()),
                    role: v.string(),
                  }),
                ),
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const members = await getWorkspaceMembersCtrl(workspaceId);
      return c.json(members);
    },
  );

export default workspace;
