import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client (Vercel integration).
 * Supports both Upstash-native and Vercel KV env names.
 */
export function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function redisConfigured(): boolean {
  return getRedis() !== null;
}

/** Single-user workspace key; override with JOB_AGENT_WORKSPACE_ID */
export function workspaceRedisKey(): string {
  const id = (process.env.JOB_AGENT_WORKSPACE_ID || "default").trim() || "default";
  return `job-agent:workspace:${id}`;
}
