import { anthropic } from "@ai-sdk/anthropic";

export const AI_MODEL_ID = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function getModel() {
  return anthropic(AI_MODEL_ID);
}

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
