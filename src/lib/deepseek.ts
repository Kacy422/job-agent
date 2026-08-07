const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export function getDeepSeekKey() {
  return process.env.DEEPSEEK_API_KEY?.trim() || "";
}

export async function callDeepSeek(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; json?: boolean }
) {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: options?.temperature ?? 0.4,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek returned empty content");
  }
  return content;
}

export function extractJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Failed to parse JSON from model response");
  }
}
