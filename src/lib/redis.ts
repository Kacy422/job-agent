import { Redis } from "@upstash/redis";

/**
 * Resolve Upstash / Vercel KV credentials from all common env names.
 * Vercel 「Upstash Redis」与 「KV」存储会注入不同前缀的变量。
 */
function resolveRedisCredentials(): { url: string; token: string } | null {
  const urlCandidates = [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.KV_REST_API_URL,
    process.env.UPSTASH_REDIS_URL,
    process.env.REDIS_URL,
    process.env.KV_URL,
  ];
  const tokenCandidates = [
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.KV_REST_API_TOKEN,
    process.env.UPSTASH_REDIS_TOKEN,
    process.env.REDIS_TOKEN,
    process.env.KV_REST_API_READ_ONLY_TOKEN,
  ];

  const url = urlCandidates.map((s) => (s || "").trim()).find(Boolean);
  const token = tokenCandidates.map((s) => (s || "").trim()).find(Boolean);

  if (!url || !token) return null;
  // KV_URL is sometimes rediss:// — REST client needs https REST URL
  if (url.startsWith("redis://") || url.startsWith("rediss://")) {
    // Prefer a dedicated REST url if only KV_URL was found without REST
    const restUrl = [
      process.env.UPSTASH_REDIS_REST_URL,
      process.env.KV_REST_API_URL,
    ]
      .map((s) => (s || "").trim())
      .find(Boolean);
    if (!restUrl) return null;
    return { url: restUrl, token };
  }
  return { url, token };
}

let cached: Redis | null | undefined;

/** Singleton Upstash Redis client (server-side only). */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const creds = resolveRedisCredentials();
  if (!creds) {
    cached = null;
    return null;
  }

  try {
    cached = new Redis({ url: creds.url, token: creds.token });
    return cached;
  } catch (err) {
    console.error("[redis] failed to init client", err);
    cached = null;
    return null;
  }
}

export function redisConfigured(): boolean {
  return resolveRedisCredentials() !== null;
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
    "缺少 Redis 凭证。请在 Vercel 项目 Environment Variables 中确认已绑定 Upstash，" +
    "并包含 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN（或 KV_REST_API_URL + KV_REST_API_TOKEN）"
  );
}
