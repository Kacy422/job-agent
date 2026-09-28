/** Fetch with Abort timeout + limited retries (network / 5xx / timeout). */

export type FetchRetryOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  /** HTTP statuses that should trigger retry (in addition to network errors) */
  retryOn?: number[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 25_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const userSignal = init.signal;
  const onAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (userSignal) userSignal.removeEventListener("abort", onAbort);
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: FetchRetryOptions = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const retries = opts.retries ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 600;
  const retryOn = opts.retryOn ?? [408, 429, 500, 502, 503, 504];

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      if (res.ok || !retryOn.includes(res.status) || attempt === retries) {
        return res;
      }
      lastErr = new Error(`HTTP ${res.status}`);
      await sleep(retryDelayMs * (attempt + 1));
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw err;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("请求失败");
}

export function formatFetchError(err: unknown, fallback = "网络请求失败"): string {
  if (err instanceof Error) {
    if (err.name === "AbortError" || /aborted|timeout/i.test(err.message)) {
      return "请求超时，请检查网络后重试";
    }
    return err.message || fallback;
  }
  return fallback;
}
