import { NextResponse } from "next/server";
import { getRedis, redisConfigured, workspaceRedisKey } from "@/lib/redis";
import {
  emptyWorkspaceSnapshot,
  normalizeWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "@/lib/workspace-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — load workspace from Redis */
export async function GET() {
  if (!redisConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          "Redis 未配置。请在 Vercel / .env.local 设置 UPSTASH_REDIS_REST_URL 与 UPSTASH_REDIS_REST_TOKEN",
        data: null,
      },
      { status: 503 }
    );
  }

  try {
    const redis = getRedis()!;
    const key = workspaceRedisKey();
    const raw = await redis.get<WorkspaceSnapshot | string>(key);

    if (raw == null) {
      return NextResponse.json({
        ok: true,
        configured: true,
        empty: true,
        data: null,
      });
    }

    // Upstash may auto-deserialize JSON, or return a string
    const parsed =
      typeof raw === "string" ? JSON.parse(raw) : (raw as unknown);
    const data = normalizeWorkspaceSnapshot(parsed);

    return NextResponse.json({
      ok: true,
      configured: true,
      empty: false,
      data,
    });
  } catch (err) {
    console.error("[workspace GET]", err);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: err instanceof Error ? err.message : "读取 Redis 失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/** PUT — save workspace to Redis */
export async function PUT(req: Request) {
  if (!redisConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: "Redis 未配置",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "无效请求体" }, { status: 400 });
    }

    const snapshot = normalizeWorkspaceSnapshot(body);
    snapshot.updatedAt = new Date().toISOString();

    const redis = getRedis()!;
    const key = workspaceRedisKey();
    await redis.set(key, snapshot);

    return NextResponse.json({
      ok: true,
      updatedAt: snapshot.updatedAt,
    });
  } catch (err) {
    console.error("[workspace PUT]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "写入 Redis 失败",
      },
      { status: 500 }
    );
  }
}

/** DELETE — reset workspace (optional) */
export async function DELETE() {
  if (!redisConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }
  try {
    const redis = getRedis()!;
    await redis.del(workspaceRedisKey());
    return NextResponse.json({
      ok: true,
      data: emptyWorkspaceSnapshot(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "删除失败" },
      { status: 500 }
    );
  }
}
