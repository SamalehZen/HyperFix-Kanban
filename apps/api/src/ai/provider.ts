import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { HTTPException } from "hono/http-exception";

/**
 * Returns true when the AI assistant has enough configuration to run.
 * - google / openai: require an API key.
 * - google-vertex: requires a GCP project (auth handled by ADC).
 */
export function isAiConfigured(): boolean {
  const provider = process.env.AI_PROVIDER;
  if (!provider) return false;

  if (provider === "google-vertex") {
    return Boolean(process.env.VERTEX_PROJECT);
  }

  return Boolean(process.env.AI_API_KEY);
}

export function getModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER;
  const apiKey = process.env.AI_API_KEY;

  if (!isAiConfigured()) {
    throw new HTTPException(503, {
      message: "AI Assistant is not configured on this server.",
    });
  }

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: apiKey || "",
        baseURL: process.env.AI_BASE_URL,
      });
      return openai.chat(process.env.AI_MODEL || "gpt-4o-mini");
    }
    case "google-vertex": {
      const vertex = createVertex({
        project: process.env.VERTEX_PROJECT,
        location: process.env.VERTEX_LOCATION || "us-central1",
      });
      // AI SDK v6: the Vertex provider is callable; there is no `.chat()`.
      return vertex(process.env.AI_MODEL || "gemini-2.0-flash");
    }
    default: {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey || "",
      });
      return google.chat(process.env.AI_MODEL || "gemini-2.0-flash");
    }
  }
}
