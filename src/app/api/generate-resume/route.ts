import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";
import {
  CV_HTML_SCHEMA_HINT,
  buildFallbackCvHtml,
  enforceInternshipBullets,
  enforceOneProjectBullet,
  ensureSkillsSection,
  mergeCompanyRoleInline,
} from "@/lib/cv-template";
import { coursePoolPromptBlock } from "@/lib/course-pool";
import {
  formatRationaleLine,
  normalizeCvRationale,
  type CvRationale,
} from "@/types";

export type CvApiHighlight = {
  id?: string;
  kind?: "added" | "removed" | "changed";
  phrase?: string;
  label?: string;
  reason?: string;
};

export type RewriteResult = {
  tailoredResumeHtml: string;
  rationale: CvRationale;
  rationaleList?: string[];
  highlights?: CvApiHighlight[];
  revisionRound?: number;
  demo?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resume = String(body.resume || "").trim();
    const currentCvHtml = String(body.currentCvHtml || "")
      .replace(/<\/?mark\b[^>]*>/gi, "")
      .trim();
    const revisionNotes = String(body.revisionNotes || "").trim();
    const revisionRound = Math.max(
      1,
      Number(body.revisionRound) || (currentCvHtml && revisionNotes ? 2 : 1)
    );

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
You MUST silently complete the following THREE steps before writing HTML. Do not skip any step. Never invent employers, degrees, dates, or metrics not grounded in the Experience Library.

=== CAREER POSITIONING (always respect) ===
Candidate focuses on PRACTICAL APPLICATION and ANALYSIS of ESG / sustainability principles (research, data, assessments, stakeholder engagement, reporting support, tools).
AVOID framing experience as drafting, setting, or making regulations / policy rules / legislation. Prefer "applied ESG analysis / assessment / implementation support" over "policy formulation".

=== STEP 1 — DEEP JD DECOMPOSITION (mandatory) ===
Carefully read the Target JD. Extract at least 5–7 core skills and duty requirements as a mental checklist, e.g.:
- data analysis / research
- cross-functional collaboration
- specific software / tools
- report writing / presentations
- stakeholder engagement
- project support / process improvement
- domain keywords (ESG, climate, sustainability, etc.)
Every later bullet must help cover this checklist — no core JD requirement left uncovered across the whole CV.

=== STEP 2 — EXPERIENCE MAPPING (mandatory) ===
Read the Full Experience Library (original CV / profile). For EACH JD requirement from Step 1, find proof from relevant experiences (e.g. Crossroads Foundation internship, Chongqing urban greening internship, academic / leadership projects).
Build an internal mapping draft: "JD requirement → matching experience(s) / evidence".
Prefer mapping that highlights applied ESG analysis & outcomes, not regulatory drafting.
Select / emphasize only library-grounded facts.

=== STEP 3 — TAILORED BULLET REWRITE (mandatory) ===
Rewrite all internship / work / project bullets from the mapping draft:
- Collectively COVER all Step-1 core requirements — do not omit any.
- Each bullet MUST start with a strong Action Verb.
- Results-oriented: fuse original quantified metrics / project outcomes from the library whenever available.
- STAR structure: Verb + Task/Context + Tools/Methods + Impact.
- Internship / Work: 2–4 bullets per entry (RECOMMENDED: 3); scale by source richness + JD match.
- Projects / Leadership: EXACTLY 1 high-impact JD-aligned bullet; dates on cv-right.
- Header (SAME LINE): Company/Project <span class="cv-role-inline">| Role</span>
  Example: Crossroads Foundation, Hong Kong <span class="cv-role-inline">| Engagement Department Intern</span>
- Fill one A4 page densely; no sparse one-liners; no page-2 overflow.

LANGUAGE RULE (MANDATORY):
- tailoredResumeHtml: Professional Resume English only (no Chinese characters).
- Chinese in library / notes → translate accurately into English and KEEP the facts.
- rationale + highlight labels/reasons: Simplified Chinese only.
- In rationale.added, briefly mention which JD requirements were covered (ultra-concise).

Output STRICT JSON only (no markdown fences):
{
  "tailoredResumeHtml": "<div class=\\"cv-sheet\\">...</div>",
  "rationale": {
    "added": [{"text":"增加的内容","reason":"简明原因"}],
    "removed": [{"text":"删减的内容","reason":"简明原因"}]
  },
  "highlights": [
    {"id":"h1","kind":"added","phrase":"EXACT substring copied from tailoredResumeHtml","label":"中文简述","reason":"简明原因"},
    {"id":"h2","kind":"changed","phrase":"another EXACT substring from the HTML","label":"中文简述","reason":"简明原因"}
  ]
}

CRITICAL HIGHLIGHT RULE:
- Each highlights[].phrase MUST appear character-for-character (case-insensitive OK) inside the FINAL tailoredResumeHtml you output.
- Prefer distinctive 6–18 word English snippets from the new bullets you just wrote.
- If you cannot find a real substring, omit that highlight — NEVER invent a phrase absent from the HTML.

=== HTML layout ===
${CV_HTML_SCHEMA_HINT}
${coursePoolPromptBlock()}

=== rationale (Simplified Chinese only) ===
- added: 1–3 items; removed: 1–2 items. Ultra-concise.

${
  isRevision
    ? `=== INCREMENTAL REVISION MODE (round ${revisionRound}) ===
BASE INPUT = the "Current Tailored CV HTML" below (this is the LATEST accepted version after round ${revisionRound - 1}).
You MUST:
1) Start from that HTML — do not regenerate from scratch unless notes require a full rewrite.
2) Re-run Steps 1–3 lightly: keep JD coverage; apply User Revision Notes on top of the baseline.
3) Output a complete updated tailoredResumeHtml reflecting ONLY the requested deltas plus preserved prior content.
4) highlights.phrase must come from the NEW output HTML (post-edit), not from the old CV.
If notes are Chinese, translate intent into English CV edits — never ignore them.`
    : ""
}`,
          },
          {
            role: "user",
            content: isRevision
              ? `【Revision Round】${revisionRound}

请先按系统提示完成：①深度拆解 JD（≥5–7 项核心要求）②经历映射（JD要求→履历证据）③逐条定制改写 Bullet Points（强动词开头、结果导向、全面覆盖 JD 核心要求；侧重 ESG 实际应用与分析，避免法规制定表述）。

【Target JD】
${jd.slice(0, 5500)}

【Full Experience Library / Profile Data — 原版履历】
${resume.slice(0, 8000)}

【Current Tailored CV HTML — BASELINE FOR THIS ROUND】
${currentCvHtml.slice(0, 14000)}

【User Revision Notes — apply on top of baseline】
${revisionNotes.slice(0, 2500)}`
              : `请严格按三步法完成定制 CV（只输出最终 JSON，不要输出中间草稿）：
① 深度拆解 JD：提取至少 5–7 个核心技能与职责要求；
② 经历映射：对每项要求在原版履历中找证据（Crossroads / 重庆相关实习 / 学术与领导力项目等），并偏向 ESG 原则的实际应用与分析（非制定法规）；
③ 逐条改写 Bullet Points：全面覆盖①中全部要求；每条以强动作动词开头；结果导向并融合原有量化数据/成果。

【Target JD】
${jd.slice(0, 5500)}

【Full Experience Library / Profile Data — 原版履历】
${resume.slice(0, 10000)}`,
          },
        ],
        {
          json: true,
          temperature: isRevision ? 0.25 : 0.35,
          timeoutMs: isRevision ? 150_000 : 120_000,
        }
      );

      const parsed = extractJson<{
        tailoredResumeHtml?: string;
        rationale?: unknown;
        rationaleList?: unknown;
        highlights?: CvApiHighlight[];
      }>(content);

      const html = normalizeHtml(parsed.tailoredResumeHtml || "");
      const rationale = ensureRationale(
        normalizeCvRationale(parsed.rationale ?? parsed.rationaleList)
      );
      const highlights = normalizeHighlights(parsed.highlights, html, rationale);

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
        highlights,
        revisionRound,
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
        const demoHtml = normalizeHtml(currentCvHtml || buildFallbackCvHtml());
        return NextResponse.json({
          tailoredResumeHtml: demoHtml,
          rationale: demoRationale,
          rationaleList: flattenRationale(demoRationale),
          highlights: normalizeHighlights(
            [
              {
                id: "h1",
                kind: "added",
                phrase: "ESG",
                label: "ESG / 气候韧性关键词",
                reason: "演示模式示意匹配 JD",
              },
            ],
            demoHtml,
            demoRationale
          ),
          revisionRound,
          demo: true,
        } satisfies RewriteResult);
      }
      console.error("[generate-resume]", err);
      if (message === "DEEPSEEK_TIMEOUT") {
        return NextResponse.json(
          { error: "生成超时，请点击重试（将基于上一版 CV 继续）" },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "生成失败，请稍后重试或检查 API Key" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}

/** Snap phrase to the exact casing substring present in HTML */
function snapPhraseToHtml(html: string, phrase: string): string | null {
  const plain = html.replace(/<[^>]+>/g, " ");
  const idx = plain.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx < 0) return null;
  return plain.slice(idx, idx + phrase.length);
}

function findEnglishSnippet(html: string, hint: string): string | null {
  const plain = html.replace(/<[^>]+>/g, " ");
  const eng = hint.match(/[A-Za-z][A-Za-z0-9+./%&\-\s]{3,}/g);
  if (eng) {
    for (const cand of eng.sort((a, b) => b.length - a.length)) {
      const t = cand.trim();
      if (t.length >= 4 && plain.toLowerCase().includes(t.toLowerCase())) {
        return snapPhraseToHtml(html, t);
      }
    }
  }
  return snapPhraseToHtml(html, hint.trim());
}

function normalizeHighlights(
  raw: CvApiHighlight[] | undefined,
  html: string,
  rationale?: CvRationale
): CvApiHighlight[] {
  const out: CvApiHighlight[] = [];
  const seen = new Set<string>();

  const push = (h: CvApiHighlight) => {
    const phrase = String(h.phrase || "").trim();
    if (phrase.length < 3) return;
    const snapped = snapPhraseToHtml(html, phrase);
    if (!snapped) return;
    const key = snapped.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: String(h.id || `h${out.length + 1}`),
      kind: h.kind === "changed" ? "changed" : "added",
      phrase: snapped,
      label: String(h.label || "").trim() || snapped.slice(0, 48),
      reason: String(h.reason || "").trim(),
    });
  };

  if (Array.isArray(raw)) {
    raw.forEach((h, i) =>
      push({ ...h, id: h.id || `h${i + 1}` })
    );
  }

  if (out.length === 0 && rationale) {
    rationale.added.forEach((item, i) => {
      const phrase = findEnglishSnippet(html, item.text);
      if (!phrase) return;
      push({
        id: `add-${i}`,
        kind: "added",
        phrase,
        label: item.text,
        reason: item.reason,
      });
    });
  }

  // Last resort: pick distinctive words from first internship bullets
  if (out.length === 0) {
    const bullets = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 40);
    bullets.slice(0, 2).forEach((b, i) => {
      const words = b.split(/\s+/).slice(0, 10).join(" ");
      push({
        id: `auto-${i}`,
        kind: "added",
        phrase: words,
        label: "JD 匹配要点",
        reason: "自动对齐生成正文",
      });
    });
  }

  return out.slice(0, 4);
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
  html = html.replace(/\bCeitificates?\s*:/gi, "Certificate:");
  html = html.replace(/\bCe[rt]{1,2}ificates?\s*:/gi, "Certificate:");
  html = html.replace(/\bCertifications?\s*:/gi, "Certificate:");
  html = mergeCompanyRoleInline(html);
  html = ensureSkillsSection(html);
  html = enforceInternshipBullets(html);
  html = enforceOneProjectBullet(html);
  return html;
}
