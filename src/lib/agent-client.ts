const AGENT_BASE =
  process.env.AGENT_SERVICE_URL?.trim() || "http://127.0.0.1:8000";

const DEFAULT_TIMEOUT_MS = 5000;

export async function agentFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
) {
  const url = `${AGENT_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeoutMs: _t, signal: userSignal, ...rest } = init || {};
    if (userSignal) {
      if (userSignal.aborted) controller.abort();
      else {
        userSignal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(rest.headers || {}),
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const aborted =
      (err instanceof Error && err.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        err instanceof DOMException &&
        err.name === "AbortError");
    return {
      ok: false,
      status: 503,
      data: {
        error: aborted
          ? `连接 Agent 超时（${timeoutMs}ms · ${AGENT_BASE}）。请确认已运行：python -m uvicorn main:app --port 8000`
          : `Agent 服务未启动（${AGENT_BASE}）。请打开终端在 agent/ 目录运行：python -m uvicorn main:app --port 8000`,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function getAgentBase() {
  return AGENT_BASE;
}

/** Browser-side direct health ping (requires Agent CORS). */
export const AGENT_PUBLIC_BASE = "http://127.0.0.1:8000";

export async function pingAgentDirect(
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const path of ["/health", "/"]) {
      try {
        const res = await fetch(`${AGENT_PUBLIC_BASE}${path}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          mode: "cors",
        });
        if (!res.ok) continue;
        const data = await res.json().catch(() => ({ ok: true }));
        if (data?.ok === false) continue;
        return { ok: true, data };
      } catch {
        /* try next path */
      }
    }
    return {
      ok: false,
      error: `无法直连 ${AGENT_PUBLIC_BASE}。请确认 Agent 已启动并开启 CORS。`,
    };
  } finally {
    clearTimeout(timer);
  }
}
