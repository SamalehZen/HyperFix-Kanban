import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import db from "../database";
import { timeEntryTable } from "../database/schema";
import { timeEntrySchema } from "../schemas";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { assertOwnTodoTask } from "../utils/workspace-role";
import createTimeEntry from "./controllers/create-time-entry";
import getTimeEntriesByTaskId from "./controllers/get-time-entries";
import getTimeEntry from "./controllers/get-time-entry";
import updateTimeEntry from "./controllers/update-time-entry";

const timeEntry = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .get(
    "/task/:taskId",
    describeRoute({
      operationId: "getTaskTimeEntries",
      tags: ["Time Entries"],
      description: "Get all time entries for a specific task",
      responses: {
        200: {
          description: "List of time entries for the task",
          content: {
            "application/json": { schema: resolver(v.array(timeEntrySchema)) },
          },
        },
      },
    }),
    validator("param", v.object({ taskId: v.string() })),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const timeEntries = await getTimeEntriesByTaskId(taskId);
      return c.json(timeEntries);
    },
  )
  .get(
    "/:id",
    describeRoute({
      operationId: "getTimeEntry",
      tags: ["Time Entries"],
      description: "Get a specific time entry by ID",
      responses: {
        200: {
          description: "Time entry details",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromTimeEntry(),
    async (c) => {
      const { id } = c.req.valid("param");
      const timeEntry = await getTimeEntry(id);
      return c.json(timeEntry);
    },
  )
  .post(
    "/",
    describeRoute({
      operationId: "createTimeEntry",
      tags: ["Time Entries"],
      description: "Create a new time entry for a task",
      responses: {
        200: {
          description: "Time entry created successfully",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator(
      "json",
      v.object({
        taskId: v.string(),
        startTime: v.string(),
        endTime: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId, startTime, endTime, description } = c.req.valid("json");
      const userId = c.get("userId");
      await assertOwnTodoTask(taskId, userId);
      const timeEntry = await createTimeEntry({
        taskId,
        userId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description,
      });
      return c.json(timeEntry);
    },
  )
  .put(
    "/:id",
    describeRoute({
      operationId: "updateTimeEntry",
      tags: ["Time Entries"],
      description: "Update an existing time entry",
      responses: {
        200: {
          description: "Time entry updated successfully",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator(
      "json",
      v.object({
        startTime: v.string(),
        endTime: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTimeEntry(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { startTime, endTime, description } = c.req.valid("json");
      const userId = c.get("userId");
      const [existing] = await db
        .select({ taskId: timeEntryTable.taskId })
        .from(timeEntryTable)
        .where(eq(timeEntryTable.id, id))
        .limit(1);
      if (!existing) {
        throw new HTTPException(404, { message: "Time entry not found" });
      }
      await assertOwnTodoTask(existing.taskId, userId);
      const timeEntry = await updateTimeEntry({
        timeEntryId: id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description,
      });
      return c.json(timeEntry);
    },
  );

export default timeEntry;
