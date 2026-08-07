import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resume = String(body.resume || "").trim();
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
            content: `You are an interview coach for Hong Kong professional hiring.
Output STRICT JSON:
{"interviewQA":[{"question":"...","tip":"...","answer":"..."}]}
Rules:
- 3 to 5 high-frequency questions for this JD.
- question: Business English.
- tip: short coaching tip in Simplified Chinese (UI only).
- answer: MUST be polished Business English for the Hong Kong job market (STAR), grounded in the experience library — no invented facts, no Chinese in answer.`,
          },
          {
            role: "user",
            content: `Role: ${jobTitle}\n\n【JD】\n${jd.slice(0, 4500)}\n\n【Experience】\n${resume.slice(0, 7000)}`,
          },
        ],
        { json: true, temperature: 0.4 }
      );
      const parsed = extractJson<{
        interviewQA?: { question?: string; tip?: string; answer?: string }[];
      }>(content);
      const interviewQA = (parsed.interviewQA || [])
        .map((q) => ({
          question: String(q.question || "").trim(),
          tip: String(q.tip || "").trim(),
          answer: String(q.answer || "").trim(),
        }))
        .filter((q) => q.question && q.answer)
        .slice(0, 5);

      if (interviewQA.length === 0) {
        return NextResponse.json({ error: "未返回面试题" }, { status: 502 });
      }
      return NextResponse.json({ interviewQA });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "MISSING_API_KEY") {
        return NextResponse.json({
          interviewQA: [
            {
              question: `Why are you interested in the ${jobTitle} role?`,
              tip: "结合 JD 关键词与个人项目经历，先结论后举例。",
              answer:
                "I am drawn to this role because it combines sustainability analysis with stakeholder engagement, which matches my internship experience in ESG outreach and site assessment.",
            },
            {
              question: "Tell me about a time you used data to support a decision.",
              tip: "用 STAR：情境-任务-行动-结果，尽量量化。",
              answer:
                "During my internship I collected partner data for ESG-focused outreach, structured contact channels, and helped the team prioritize collaboration models.",
            },
            {
              question: "How do you handle cross-cultural teamwork?",
              tip: "强调沟通主动性与学习敏捷性。",
              answer:
                "In an international NGO setting I adapted quickly, clarified expectations early, and collaborated across cultural contexts to deliver shared outcomes.",
            },
          ],
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
