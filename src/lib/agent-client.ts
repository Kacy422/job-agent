/**
 * Agent HTTP client
 * - Browser: always use same-origin `/api/agent` (Next.js rewrite → :8000)
 * - Server (Route Handlers): talk to AGENT_SERVICE_URL / 127.0.0.1:8000 directly
 */

const SERVER_AGENT_BASE =
  process.env.AGENT_SERVICE_URL?.trim() || "http://127.0.0.1:8000";

/** Relative base for browser fetch — proxied by next.config.js rewrites */
export const AGENT_BROWSER_BASE = "/api/agent";

const DEFAULT_TIMEOUT_MS = 5000;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAgentBase() {
  return isBrowser() ? AGENT_BROWSER_BASE : SERVER_AGENT_BASE;
}

function joinAgentUrl(path: string) {
  const base = getAgentBase().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  // Browser base is /api/agent; path /health → /api/agent/health
  return `${base}${p}`;
}

export async function agentFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
) {
  const url = joinAgentUrl(path);
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
    const where = getAgentBase();
    return {
      ok: false,
      status: 503,
      data: {
        error: aborted
          ? `连接 Agent 超时（${timeoutMs}ms · ${where}）。请确认已运行：python -m uvicorn main:app --port 8000`
          : `Agent 服务未启动（${where}）。请打开终端在 agent/ 目录运行：python -m uvicorn main:app --port 8000`,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Health check via relative /api/agent (rewrite) — safe on HTTPS pages */
export async function pingAgentHealth(
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ ok: boolean; data?: unknown; error?: string; source?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const path of ["/health", "/"]) {
      try {
        const res = await fetch(`${AGENT_BROWSER_BASE}${path === "/" ? "" : path}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = await res.json().catch(() => ({ ok: true }));
        if (data?.ok === false) continue;
        return {
          ok: true,
          data,
          source: path === "/" ? "/api/agent" : "/api/agent/health",
        };
      } catch {
        /* try next */
      }
    }
    return {
      ok: false,
      error:
        "无法通过 /api/agent 连接本地 Agent。请确认已运行：python -m uvicorn main:app --port 8000",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated use pingAgentHealth — kept as alias */
export const pingAgentDirect = pingAgentHealth;
