import Redis from "ioredis";

/**
 * Redis client via Vercel-injected REDIS_URL.
 * Example: rediss://default:****@****.upstash.io:6379
 *
 * Uses ioredis so we can connect with only REDIS_URL — no separate REST token.
 */
let cached: Redis | null | undefined;

function getRedisUrl(): string | null {
  const url = (process.env.REDIS_URL || "").trim();
  return url || null;
}

/** Singleton Redis client (server-side / Node runtime only). */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const url = getRedisUrl();
  if (!url) {
    cached = null;
    return null;
  }

  try {
    // Direct connection string — matches Vercel auto-injected REDIS_URL
    cached = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      // Reuse across warm serverless invocations
      lazyConnect: false,
    });

    cached.on("error", (err) => {
      console.error("[redis] connection error", err);
    });

    return cached;
  } catch (err) {
    console.error("[redis] failed to init client from REDIS_URL", err);
    cached = null;
    return null;
  }
}

export function redisConfigured(): boolean {
  return Boolean(getRedisUrl());
}

/** Single-user workspace key; override with JOB_AGENT_WORKSPACE_ID */
export function workspaceRedisKey(): string {
  const id =
    (process.env.JOB_AGENT_WORKSPACE_ID || "default").trim() || "default";
  return `job-agent:workspace:${id}`;
}

/** Debug helper for /api/workspace status */
export function redisConfigHint(): string {
  if (redisConfigured()) return "ok";
  return (
    "缺少 REDIS_URL。请确认 Vercel 已绑定 Redis 存储并自动注入 REDIS_URL 环境变量。"
  );
}
