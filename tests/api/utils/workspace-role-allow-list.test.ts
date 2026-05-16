import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canEmailCreateWorkspace,
  getWorkspaceCreationAllowedEmails,
} from "../../../apps/api/src/utils/workspace-role";

describe("workspace-role: WORKSPACE_CREATION_ALLOWED_EMAILS", () => {
  const KEY = "WORKSPACE_CREATION_ALLOWED_EMAILS";
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[KEY];
    delete process.env[KEY];
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[KEY];
    } else {
      process.env[KEY] = original;
    }
  });

  it("returns no allow-list and permits everyone when unset/empty", () => {
    expect(getWorkspaceCreationAllowedEmails()).toEqual([]);
    expect(canEmailCreateWorkspace("anyone@example.com")).toBe(true);
    expect(canEmailCreateWorkspace(undefined)).toBe(true);

    process.env[KEY] = "   ";
    expect(getWorkspaceCreationAllowedEmails()).toEqual([]);
    expect(canEmailCreateWorkspace("anyone@example.com")).toBe(true);
  });

  it("normalises emails (trim + lowercase) and only allows listed addresses", () => {
    process.env[KEY] = "  Admin@Example.COM ,, Owner@Example.com , ";
    expect(getWorkspaceCreationAllowedEmails()).toEqual([
      "admin@example.com",
      "owner@example.com",
    ]);

    expect(canEmailCreateWorkspace("admin@example.com")).toBe(true);
    expect(canEmailCreateWorkspace("ADMIN@example.com")).toBe(true);
    expect(canEmailCreateWorkspace(" owner@example.com ")).toBe(true);
    expect(canEmailCreateWorkspace("stranger@example.com")).toBe(false);
    expect(canEmailCreateWorkspace(null)).toBe(false);
    expect(canEmailCreateWorkspace(undefined)).toBe(false);
    expect(canEmailCreateWorkspace("")).toBe(false);
  });
});
