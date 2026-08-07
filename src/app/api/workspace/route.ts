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

    // Explicit JSON string avoids rare double-encode edge cases across SDK versions
    await redis.set(key, JSON.stringify(snapshot));

    // Verify write (ensures multi-device can read what we just saved)
    const verify = await redis.get(key);
    if (verify == null) {
      return NextResponse.json(
        { ok: false, error: "写入 Redis 后校验失败（值为空）" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      key,
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
