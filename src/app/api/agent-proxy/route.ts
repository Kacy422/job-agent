import { NextResponse } from "next/server";
import { agentFetch } from "@/lib/agent-client";

/**
 * Unified Agent proxy.
 * POST body.action = start | confirm-login | stop
 * GET  ?action=status&sessionId=
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "status";

  if (action === "health") {
    const result = await agentFetch("/health");
    return NextResponse.json(
      result.ok
        ? { ok: true, ...(result.data || {}) }
        : {
            ok: false,
            error:
              result.data?.error ||
              "Agent 服务未启动。请打开终端在 agent/ 目录运行：python -m uvicorn main:app --port 8000",
          },
      { status: result.ok ? 200 : 503 }
    );
  }

  if (action !== "status") {
    return NextResponse.json({ error: "未知操作" }, { status: 404 });
  }
  const sessionId = searchParams.get("sessionId") || "";
  if (!sessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }
  const result = await agentFetch(`/sessions/${sessionId}`);
  return NextResponse.json(result.data, {
    status: result.ok ? 200 : result.status,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  if (action === "start") {
    const result = await agentFetch("/sessions/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result.data, {
      status: result.ok ? 200 : result.status,
    });
  }

  if (action === "confirm-login") {
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }
    const result = await agentFetch(`/sessions/${sessionId}/confirm-login`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result.data, {
      status: result.ok ? 200 : result.status,
    });
  }

  if (action === "provide-profile") {
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }
    const result = await agentFetch(`/sessions/${sessionId}/provide-profile`, {
      method: "POST",
      body: JSON.stringify({
        profile: body.profile || {},
        answers: body.answers || {},
        skipMissing: Boolean(body.skipMissing),
      }),
    });
    return NextResponse.json(result.data, {
      status: result.ok ? 200 : result.status,
    });
  }

  if (action === "stop") {
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }
    const result = await agentFetch(`/sessions/${sessionId}/stop`, {
      method: "POST",
    });
    return NextResponse.json(result.data, {
      status: result.ok ? 200 : result.status,
    });
  }

  return NextResponse.json(
    { error: "请提供 action: start | confirm-login | provide-profile | stop" },
    { status: 400 }
  );
}
