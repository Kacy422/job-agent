import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resume = String(body.resume || "").trim();
    const company = String(body.company || "the company").trim();
    const jobTitle = String(body.jobTitle || "the role").trim();

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供 JD 与全量经历" },
        { status: 400 }
      );
    }

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content: `You write Cover Letters for the Hong Kong job market (MNC / local professional firms).
Output STRICT JSON: {"coverLetter":"full letter text"}.

MANDATORY LANGUAGE: High-quality Business English for Hong Kong applications ONLY. No Chinese characters.
Rules: 280-420 words; formal but warm; tailor to the JD using only the experience library; do not invent facts; prefer British/HK business phrasing where natural.`,
          },
          {
            role: "user",
            content: `Role: ${jobTitle}\nCompany: ${company}\n\n【JD】\n${jd.slice(0, 4500)}\n\n【Experience】\n${resume.slice(0, 7000)}`,
          },
        ],
        { json: true, temperature: 0.45 }
      );
      const parsed = extractJson<{ coverLetter?: string }>(content);
      const coverLetter = String(parsed.coverLetter || "").trim();
      if (!coverLetter) {
        return NextResponse.json({ error: "未返回 Cover Letter" }, { status: 502 });
      }
      return NextResponse.json({ coverLetter });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "MISSING_API_KEY") {
        return NextResponse.json({
          coverLetter: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}. My background aligns with the role requirements described in the job posting, and I would welcome the opportunity to contribute.\n\nThank you for your consideration.\n\nSincerely,\n[Your Name]`,
          demo: true,
        });
      }
      console.error(err);
      return NextResponse.json({ error: "生成失败" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
