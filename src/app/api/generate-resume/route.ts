import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";
import {
  CV_HTML_SCHEMA_HINT,
  buildFallbackCvHtml,
} from "@/lib/cv-template";
import {
  formatRationaleLine,
  normalizeCvRationale,
  type CvRationale,
} from "@/types";

export type RewriteResult = {
  tailoredResumeHtml: string;
  rationale: CvRationale;
  rationaleList?: string[];
  demo?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resume = String(body.resume || "").trim();

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供目标 JD 与全量经历库内容" },
        { status: 400 }
      );
    }

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content: `You are an expert CV rewriter for the Hong Kong job market (international / MNC / local firms).
Rewrite the candidate's full experience library to fit ONE target JD.

LANGUAGE RULE (MANDATORY):
- tailoredResumeHtml MUST be high-quality Business English suitable for Hong Kong applications. No Chinese characters inside the CV HTML.
- rationale may use Simplified Chinese for the candidate's internal notes ONLY.

Output STRICT JSON only (no markdown fences):
{
  "tailoredResumeHtml": "<div class=\\"cv-sheet\\">...</div>",
  "rationale": {
    "added": [{"text":"增加的内容","reason":"简明原因"}],
    "removed": [{"text":"删减的内容","reason":"简明原因"}]
  }
}

=== bilingual output rules (MUST follow) ===
1) tailoredResumeHtml: STRICTLY English only. Follow the classic PDF HTML layout classes.
   ${CV_HTML_SCHEMA_HINT}
   Prefer sections: EDUCATION, INTERNSHIP EXPERIENCE, then SCHOOL PROJECTS & LEADERSHIP or PROJECTS & OTHER EXPERIENCES, then SKILLS.
   Internship headers MUST be "Company, City" with role on the next line (cv-role).
   Never invent employers/degrees/dates. No Chinese characters inside tailoredResumeHtml.
   Use polished HK Business English tone (clear, concise, achievement-oriented).

2) rationale: STRICTLY Simplified Chinese only — ONLY two arrays (no other fields):
   - added【增加】: 1–3 items. Each {text, reason}. text = 新增的专业词/量化指标/强动词；reason = 为何增加（极短）。
   - removed【减少】: 1–2 items. Each {text, reason}. text = 删减的无关经历或冗余；reason = 为何删减（极短）。
   Do NOT include a separate "why" field. Keep ultra-concise. No English / Traditional Chinese.`,
          },
          {
            role: "user",
            content: `【Target JD】\n${jd.slice(0, 5500)}\n\n【Full Experience Library】\n${resume.slice(0, 9000)}`,
          },
        ],
        { json: true, temperature: 0.35 }
      );

      const parsed = extractJson<{
        tailoredResumeHtml?: string;
        rationale?: unknown;
        rationaleList?: unknown;
      }>(content);

      const html = normalizeHtml(parsed.tailoredResumeHtml || "");
      const rationale = ensureRationale(
        normalizeCvRationale(parsed.rationale ?? parsed.rationaleList)
      );

      if (!html) {
        return NextResponse.json(
          { error: "模型未返回有效 HTML 简历" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        tailoredResumeHtml: html,
        rationale,
        rationaleList: flattenRationale(rationale),
      } satisfies RewriteResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "MISSING_API_KEY") {
        const demoRationale: CvRationale = {
          added: [
            {
              text: "ESG / 气候韧性关键词与强动词（Conducted / Assisted）",
              reason: "演示模式示意匹配 JD",
            },
          ],
          removed: [
            {
              text: "与目标岗位关联度较低的冗余描述",
              reason: "演示模式示意精简篇幅",
            },
          ],
        };
        return NextResponse.json({
          tailoredResumeHtml: buildFallbackCvHtml(),
          rationale: demoRationale,
          rationaleList: flattenRationale(demoRationale),
          demo: true,
        } satisfies RewriteResult);
      }
      console.error("[generate-resume]", err);
      return NextResponse.json(
        { error: "生成失败，请稍后重试或检查 API Key" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}

function ensureRationale(r: CvRationale): CvRationale {
  if (r.added.length || r.removed.length) return r;
  return {
    added: [
      {
        text: "相关专业关键词与更强行动动词",
        reason: "提升与 JD 的语义匹配",
      },
    ],
    removed: [
      {
        text: "关联度较低的冗余表述",
        reason: "突出核心可迁移经历",
      },
    ],
  };
}

function flattenRationale(r: CvRationale): string[] {
  return [...r.added, ...r.removed].map(formatRationaleLine);
}

function normalizeHtml(raw: string): string {
  let html = raw.trim();
  html = html
    .replace(/^```(?:html|HTML)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (!html) return "";
  if (!html.includes("cv-sheet")) {
    html = `<div class="cv-sheet">${html}</div>`;
  }
  html = html.replace(
    /(<li[^>]*>)\s*(?:[•●◦▪▸►·]|[-–—*]|\\u2022|&bull;|&#8226;)\s*/gi,
    "$1"
  );
  html = html.replace(/\s*list-style[^;:"']*:[^;"']*;?/gi, "");
  return html;
}
