import { NextResponse } from "next/server";
import {
  getRedis,
  redisConfigured,
  redisConfigHint,
  workspaceRedisKey,
} from "@/lib/redis";
import {
  emptyWorkspaceSnapshot,
  normalizeWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "@/lib/workspace-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStored(raw: unknown): WorkspaceSnapshot | null {
  if (raw == null) return null;
  try {
    const parsed =
      typeof raw === "string" ? JSON.parse(raw) : (raw as unknown);
    return normalizeWorkspaceSnapshot(parsed);
  } catch (err) {
    console.error("[workspace] parse stored value failed", err);
    return null;
  }
}

/** GET — load workspace from Redis (source of truth) */
export async function GET() {
  if (!redisConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: redisConfigHint(),
        data: null,
      },
      { status: 503 }
    );
  }

  try {
    const redis = getRedis()!;
    const key = workspaceRedisKey();
    const raw = await redis.get(key);

    if (raw == null) {
      return NextResponse.json({
        ok: true,
        configured: true,
        empty: true,
        key,
        data: null,
      });
    }

    const data = parseStored(raw);
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          error: "云端数据格式损坏，请重新保存",
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      empty: false,
      key,
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

/** PUT — save workspace to Redis (source of truth) */
export async function PUT(req: Request) {
  if (!redisConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: redisConfigHint(),
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
    const payload = JSON.stringify(snapshot);

    // Guard against oversized payloads (Upstash free tier ~1MB typical)
    const bytes = Buffer.byteLength(payload, "utf8");
    if (bytes > 900_000) {
      return NextResponse.json(
        {
          ok: false,
          error: `工作区数据过大（约 ${Math.round(bytes / 1024)}KB）。请删减旧求职记录中的 CV / Cover Letter 后重试。`,
        },
        { status: 413 }
      );
    }

    await redis.set(key, payload);

    return NextResponse.json({
      ok: true,
      configured: true,
      key,
      updatedAt: snapshot.updatedAt,
      bytes,
    });
  } catch (err) {
    console.error("[workspace PUT]", err);
    const msg = err instanceof Error ? err.message : "写入 Redis 失败";
    const isTimeout = /timeout|ETIMEDOUT|ECONNRESET|Command timed out/i.test(
      msg
    );
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout
          ? "云端存储超时，请稍后重试（本机缓存已保留）"
          : msg,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}

/** DELETE — reset workspace */
export async function DELETE() {
  if (!redisConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: redisConfigHint() },
      { status: 503 }
    );
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
