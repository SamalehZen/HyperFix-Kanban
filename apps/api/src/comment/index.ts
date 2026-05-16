import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import db from "../database";
import { commentTable } from "../database/schema";
import { commentSchema } from "../schemas";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createComment from "./controllers/create-comment";
import deleteComment from "./controllers/delete-comment";
import getComments from "./controllers/get-comments";
import updateComment from "./controllers/update-comment";

/**
 * Loads the comment and lets the existing controller-level author check decide
 * whether the caller may proceed. workspaceAccess.fromComment has already
 * verified that the caller belongs to the task's workspace.
 */
async function assertMemberCanTouchCommentByCommentId(
  commentId: string,
  userId: string,
) {
  const [existing] = await db
    .select({
      authorId: commentTable.userId,
    })
    .from(commentTable)
    .where(eq(commentTable.id, commentId))
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: "Comment not found" });
  }

  if (existing.authorId !== userId) {
    throw new HTTPException(403, {
      message: "Only the author can edit this comment",
    });
  }
}

const comment = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .get(
    "/:taskId",
    describeRoute({
      operationId: "getTaskComments",
      tags: ["Comments"],
      description: "Get all comments for a specific task",
      responses: {
        200: {
          description: "List of comments for the task",
          content: {
            "application/json": {
              schema: resolver(v.array(commentSchema)),
            },
          },
        },
      },
    }),
    validator("param", v.object({ taskId: v.string() })),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const comments = await getComments(taskId);
      return c.json(comments);
    },
  )
  .post(
    "/:taskId",
    describeRoute({
      operationId: "createTaskComment",
      tags: ["Comments"],
      description: "Create a new comment on a task",
      responses: {
        200: {
          description: "Comment created successfully",
          content: {
            "application/json": { schema: resolver(commentSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ taskId: v.string() })),
    validator(
      "json",
      v.object({ content: v.pipe(v.string(), v.minLength(1)) }),
    ),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const { content } = c.req.valid("json");
      const userId = c.get("userId");
      const newComment = await createComment(taskId, userId, content);
      return c.json(newComment);
    },
  )
  .put(
    "/:id",
    describeRoute({
      operationId: "updateTaskComment",
      tags: ["Comments"],
      description: "Update an existing comment (author only)",
      responses: {
        200: {
          description: "Comment updated successfully",
          content: {
            "application/json": { schema: resolver(commentSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator(
      "json",
      v.object({ content: v.pipe(v.string(), v.minLength(1)) }),
    ),
    workspaceAccess.fromComment(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { content } = c.req.valid("json");
      const userId = c.get("userId");
      await assertMemberCanTouchCommentByCommentId(id, userId);
      const updated = await updateComment(userId, id, content);
      return c.json(updated);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      operationId: "deleteTaskComment",
      tags: ["Comments"],
      description: "Delete a comment (author only)",
      responses: {
        200: {
          description: "Comment deleted successfully",
          content: {
            "application/json": { schema: resolver(commentSchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromComment(),
    async (c) => {
      const { id } = c.req.valid("param");
      const userId = c.get("userId");
      await assertMemberCanTouchCommentByCommentId(id, userId);
      const deleted = await deleteComment(userId, id);
      return c.json(deleted);
    },
  );

export default comment;
