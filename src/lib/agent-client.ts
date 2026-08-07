const AGENT_BASE =
  process.env.AGENT_SERVICE_URL?.trim() || "http://127.0.0.1:8000";

export async function agentFetch(path: string, init?: RequestInit) {
  const url = `${AGENT_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "无法连接自动化 Agent 服务";
    return {
      ok: false,
      status: 503,
      data: {
        error: `Agent 服务未启动（${AGENT_BASE}）。请打开终端在 agent/ 目录运行：python -m uvicorn main:app --port 8000`,
      },
    };
  }
}

export function getAgentBase() {
  return AGENT_BASE;
}
