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
    const currentCvHtml = String(body.currentCvHtml || "").trim();
    const revisionNotes = String(body.revisionNotes || "").trim();

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供目标 JD 与全量经历库内容" },
        { status: 400 }
      );
    }

    const isRevision = Boolean(revisionNotes && currentCvHtml);

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content: `You are an expert CV rewriter for the Hong Kong job market (MNC / local professional firms).

=== STEP A — JD ANALYSIS (do this first, mentally; do not output it) ===
From the Target JD, extract:
1) Hard skills / tools / domain keywords (e.g. GIS, ESG, Python, stakeholder engagement)
2) Soft skills / competencies (communication, cross-cultural, analytical rigor)
3) Role pain points / must-haves (what the hiring manager needs solved)
4) Preferred seniority / education signals

=== STEP B — GROUNDED REWRITE ===
Rewrite ONLY using facts from the candidate's Full Experience Library.
- Map library bullets to JD keywords / pain points (rephrase & prioritise; never invent employers, degrees, dates, or metrics).
- Elevate matching experience; demote or trim low-relevance content.
- Prefer quantified, achievement-oriented HK Business English.

LANGUAGE RULE (MANDATORY):
- tailoredResumeHtml: high-quality Business English for Hong Kong applications. NO Chinese inside the CV HTML.
- rationale: Simplified Chinese only (internal notes).

Output STRICT JSON only (no markdown fences):
{
  "tailoredResumeHtml": "<div class=\\"cv-sheet\\">...</div>",
  "rationale": {
    "added": [{"text":"增加的内容","reason":"简明原因"}],
    "removed": [{"text":"删减的内容","reason":"简明原因"}]
  }
}

=== HTML layout ===
${CV_HTML_SCHEMA_HINT}
Prefer sections: EDUCATION, INTERNSHIP EXPERIENCE, then SCHOOL PROJECTS & LEADERSHIP or PROJECTS & OTHER EXPERIENCES, then SKILLS.
Internship headers MUST be "Company, City" with role on the next line (cv-role).

=== rationale (Simplified Chinese only) ===
- added【增加】: 1–3 items {text, reason} — new JD keywords / metrics / stronger verbs you emphasised.
- removed【减少】: 1–2 items {text, reason} — what you cut as low relevance.
Keep ultra-concise. No English / Traditional Chinese in rationale.

${
  isRevision
    ? `=== REVISION MODE ===
You are refining an EXISTING tailored CV. Respect the current HTML structure/classes.
Apply the user's revision notes precisely while staying grounded in the experience library and JD.
Do not discard strong JD alignment already present unless the notes require it.`
    : ""
}`,
          },
          {
            role: "user",
            content: isRevision
              ? `【Target JD】\n${jd.slice(0, 5500)}\n\n【Full Experience Library】\n${resume.slice(0, 7000)}\n\n【Current Tailored CV HTML】\n${currentCvHtml.slice(0, 12000)}\n\n【User Revision Notes】\n${revisionNotes.slice(0, 2000)}`
              : `【Target JD】\n${jd.slice(0, 5500)}\n\n【Full Experience Library】\n${resume.slice(0, 9000)}`,
          },
        ],
        { json: true, temperature: isRevision ? 0.3 : 0.35 }
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
          tailoredResumeHtml: currentCvHtml || buildFallbackCvHtml(),
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
