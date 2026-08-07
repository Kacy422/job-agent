import { callDeepSeek, extractJson, getDeepSeekKey } from "@/lib/deepseek";
import type { ScoreResult } from "@/types";

export async function scoreJdAgainstResume(
  jd: string,
  resume: string,
  title?: string
): Promise<ScoreResult> {
  if (!resume.trim()) {
    return {
      score: 60,
      strengths: ["可完善 Master CV 后获得更准匹配"],
      gaps: ["尚未提供简历"],
      summary: "缺少简历",
      keywords: [],
    };
  }

  if (!getDeepSeekKey()) {
    return localScore(jd, resume, title);
  }

  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content:
            '你是资深招聘顾问。对比岗位 JD 与候选人 Master CV，输出严格 JSON：{"score":0-100整数,"keywords":[JD关键词最多10个],"strengths":[最多4条中文短句],"gaps":[最多4条中文短板/缺口],"summary":"一句话中文总结"}。不要编造简历没有的经历。',
        },
        {
          role: "user",
          content: `岗位标题：${title || "未知"}\n\n【JD】\n${jd.slice(0, 8000)}\n\n【Master CV】\n${resume.slice(0, 6000)}`,
        },
      ],
      { json: true, temperature: 0.2 }
    );

    const parsed = extractJson<ScoreResult>(content);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 70)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 4) : [],
      summary: parsed.summary || "",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
    };
  } catch {
    return localScore(jd, resume, title);
  }
}

function localScore(jd: string, resume: string, title?: string): ScoreResult {
  const tokens = `${title || ""} ${jd}`
    .toLowerCase()
    .split(/[^a-zA-Z0-9\u4e00-\u9fff]+/)
    .filter((t) => t.length >= 2);
  const unique = Array.from(new Set(tokens)).slice(0, 40);
  const resumeLower = resume.toLowerCase();
  const hits = unique.filter((t) => resumeLower.includes(t));
  const ratio = unique.length ? hits.length / unique.length : 0.4;

  return {
    score: Math.round(55 + ratio * 40),
    strengths: hits.slice(0, 3).map((h) => `简历覆盖「${h}」`),
    gaps: [
      "建议补充与 JD 更直接相关的量化成果",
      "可强化行业框架 / 工具栈表述",
      "补充与目标公司业务对齐的案例",
    ].slice(0, Math.max(1, 3 - Math.floor(ratio * 3))),
    summary: "未配置 DeepSeek API Key，已使用本地启发式匹配。",
    keywords: hits.slice(0, 8),
  };
}
