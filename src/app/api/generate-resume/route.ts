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

export type RevisionAlignment = {
  instruction: string;
  status: "done" | "partial" | "blocked";
  evidence: string;
  note: string;
};

export type RewriteResult = {
  tailoredResumeHtml: string;
  rationale: CvRationale;
  rationaleList?: string[];
  highlights?: CvApiHighlight[];
  revisionAlignments?: RevisionAlignment[];
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
    const baseCvHtml = String(body.baseCvHtml || "")
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
    /** Fine-tune from a previously saved tailored CV (not master-from-scratch) */
    const isBaseFineTune = Boolean(baseCvHtml) && !isRevision;

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content: `You are an expert CV rewriter for the Hong Kong job market (MNC / local professional firms).
You MUST silently complete the pipeline below before writing HTML. Never invent employers, degrees, dates, or metrics not grounded in the Experience Library / Profile Data.

=== CAREER POSITIONING (always respect) ===
Candidate focuses on PRACTICAL APPLICATION and ANALYSIS of ESG / sustainability principles (research, data, assessments, stakeholder engagement, reporting support, tools).
AVOID framing experience as drafting, setting, or making regulations / policy rules / legislation.

=== STEP 1 — DEEP JD DECOMPOSITION ===
Extract ≥5–7 core skills / duties from the Target JD (tools, soft skills, deliverables, domains).

=== STEP 2 — SEMANTIC & CONTEXTUAL MATCHING (CRITICAL — NOT literal keyword matching) ===
FORBIDDEN: surface / literal word matching only (e.g. only keep a bullet because it contains the exact JD token).
REQUIRED: semantic generalization + synonym / near-skill mining across the FULL Profile Data:
- Meaning proximity (e.g. "stakeholder outreach" ≈ "partner engagement" ≈ "cross-cultural collaboration")
- Soft-skill transfer (initiative, learning agility, communication, coordination)
- Tool / method adjacency (GIS / ArcGIS / spatial analysis / data collection / Excel research)
- Business-logic similarity (research→insight→recommendation; assessment→reporting; project support)
If Profile Data has ANY experience that is close in meaning, soft skill, tool use, or business logic to a JD need, you MUST maximize extraction and fuse it into high-value STAR bullets.
Goal: maximize JD coverage depth — prefer richer, evidence-backed bullets over sparse literal echoes.

=== STEP 3 — TAILORED BULLET REWRITE ===
- Cover all Step-1 requirements via the semantic mapping (no core JD need left uncovered).
- Strong Action Verb + Task/Context + Tools/Methods + Impact; keep library metrics.
- Internship / Work: 2–4 bullets/entry (RECOMMENDED: 3).
- Projects / Leadership: EXACTLY 1 bullet; dates on cv-right.
- Header SAME LINE: Company <span class="cv-role-inline">| Role</span>
- One dense A4 page; no page-2 overflow.

${
  isBaseFineTune
    ? `=== BASE CV FINE-TUNE MODE (HIGHEST PRIORITY FOR THIS RUN) ===
You are given a previously tailored Base CV (HTML) that was already customized for another role, PLUS a New Target JD.
Your job is NOT to rebuild from the Master Profile alone.
MUST:
1) Start from the Base CV HTML — preserve its strong structure, section order, Company|Role headers, and core experience selection.
2) Perform targeted secondary fine-tuning: re-align keywords, emphasis, and STAR bullets to the New JD.
3) Keep high-quality Base CV content that still fits; only rewrite / swap bullets where New JD alignment requires it.
4) Use Full Experience Library / Profile Data as the FACT CHECK and gap-fill source — never invent; prefer adapting Base CV wording over inventing new employers.
5) Output a complete updated tailoredResumeHtml (full A4 HTML), not a diff patch.`
    : ""
}

LANGUAGE:
- tailoredResumeHtml: Professional Resume English only.
- Chinese source → translate accurately; keep facts.
- rationale / highlight labels / revisionAlignments.note: Simplified Chinese.

${
  isRevision
    ? `=== COMMAND EXECUTION AGENT MODE (revision round ${revisionRound}) — HIGHEST PRIORITY ===
You are a Command Execution Agent, NOT a free rewriter.
BASE = Current Tailored CV HTML (latest accepted version). Start from it; do not ignore prior content.
Parse User Revision Notes into an ordered checklist of ATOMIC commands (split by newlines / ； / ; / numbered lists).
For EVERY command you MUST:
1) Execute it precisely on the CV (edit the relevant bullets / sections).
2) NEVER skip, drop, or vaguely "summarize away" a command.
3) If a command cannot be fully done without inventing facts, do the maximum library-grounded partial edit and mark status "partial" or "blocked" with an honest note — still attempt nearby semantic evidence from Profile Data.
4) After edits, output revisionAlignments[] with ONE entry per command, in the same order as parsed commands.
Each alignment MUST include evidence = an EXACT English substring from the NEW tailoredResumeHtml proving the edit landed (or "" if blocked).
100% of user instructions must appear in revisionAlignments. highlights.phrase must come from the NEW HTML.
Also keep JD semantic coverage unless a command explicitly overrides it.`
    : ""
}

Output STRICT JSON only (no markdown fences):
{
  "tailoredResumeHtml": "<div class=\\"cv-sheet\\">...</div>",
  "rationale": {
    "added": [{"text":"增加的内容","reason":"简明原因"}],
    "removed": [{"text":"删减的内容","reason":"简明原因"}]
  },
  "highlights": [
    {"id":"h1","kind":"added","phrase":"EXACT substring from tailoredResumeHtml","label":"中文简述","reason":"简明原因"}
  ]${
    isRevision
      ? `,
  "revisionAlignments": [
    {"instruction":"用户原指令原文","status":"done","evidence":"EXACT English snippet from new HTML","note":"如何落地的中文说明"}
  ]`
      : ""
  }
}

HIGHLIGHT RULE: phrase must exist in final HTML; omit if not found.

=== HTML layout ===
${CV_HTML_SCHEMA_HINT}
${coursePoolPromptBlock()}

=== rationale ===
- added: 1–3; removed: 1–2. Ultra-concise Simplified Chinese.`,
          },
          {
            role: "user",
            content: isRevision
              ? `【Revision Round】${revisionRound}

你是 Command Execution Agent：必须逐条执行下方每一条修改指令，不得遗漏。
同时继续做语义级 JD×履历匹配（禁止纯字面匹配），最大化提取 Profile Data 中相近经历。

【Target JD】
${jd.slice(0, 5500)}

【Full Experience Library / Profile Data】
${resume.slice(0, 8000)}

【Current Tailored CV HTML — BASELINE】
${currentCvHtml.slice(0, 14000)}

【User Revision Commands — EXECUTE EACH ONE】
${revisionNotes.slice(0, 2500)}

完成后 JSON 必须包含 revisionAlignments，与上述指令一一对应。`
              : isBaseFineTune
                ? `当前提供了一份经过初步定制的基础简历（Base CV）以及一个新的目标岗位描述（New JD）。
请在保留原有基础简历中优质结构与核心经历的前提下，根据 New JD 进行二次针对性微调与关键词对齐，输出一份更新后的 CV。
禁止从零重写；Profile Data 仅用于事实校验与必要补强，不得虚构。

【New Target JD】
${jd.slice(0, 5500)}

【Full Experience Library / Profile Data — fact check】
${resume.slice(0, 8000)}

【Base CV HTML — START FROM THIS】
${baseCvHtml.slice(0, 14000)}`
                : `请按三步法定制 CV（只输出最终 JSON）：
① 深度拆解 JD（≥5–7 核心要求）；
② 语义/同义/软技能/工具/业务逻辑级匹配 Profile Data（禁止表面字面匹配；最大化提取相近经历）；
③ 逐条改写 STAR bullets，全面覆盖 JD；强动词；融合量化成果；侧重 ESG 实际应用与分析。

【Target JD】
${jd.slice(0, 5500)}

【Full Experience Library / Profile Data】
${resume.slice(0, 10000)}`,
          },
        ],
        {
          json: true,
          temperature: isRevision ? 0.2 : isBaseFineTune ? 0.28 : 0.35,
          timeoutMs: isRevision || isBaseFineTune ? 150_000 : 120_000,
        }
      );

      const parsed = extractJson<{
        tailoredResumeHtml?: string;
        rationale?: unknown;
        rationaleList?: unknown;
        highlights?: CvApiHighlight[];
        revisionAlignments?: RevisionAlignment[];
      }>(content);

      const html = normalizeHtml(parsed.tailoredResumeHtml || "");
      const rationale = ensureRationale(
        normalizeCvRationale(parsed.rationale ?? parsed.rationaleList)
      );
      const highlights = normalizeHighlights(parsed.highlights, html, rationale);
      const revisionAlignments = isRevision
        ? normalizeRevisionAlignments(
            parsed.revisionAlignments,
            revisionNotes,
            html
          )
        : undefined;

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
        revisionAlignments,
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
          revisionAlignments: isRevision
            ? normalizeRevisionAlignments(undefined, revisionNotes, demoHtml)
            : undefined,
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

function splitRevisionCommands(notes: string): string[] {
  return notes
    .split(/\n+|；|;|。(?=\S)|(?<=\d)[.)、]\s*/)
    .map((s) => s.replace(/^\s*[-•*\d.)、]+\s*/, "").trim())
    .filter((s) => s.length >= 2);
}

function normalizeRevisionAlignments(
  raw: RevisionAlignment[] | undefined,
  notes: string,
  html: string
): RevisionAlignment[] {
  const cmds = splitRevisionCommands(notes);
  const list = Array.isArray(raw) ? raw : [];
  if (cmds.length === 0) return [];

  return cmds.map((instruction, i) => {
    const hit = list[i];
    const evidence = String(hit?.evidence || "").trim();
    const snapped = evidence ? snapPhraseToHtml(html, evidence) : null;
    let status: RevisionAlignment["status"] =
      hit?.status === "partial" || hit?.status === "blocked"
        ? hit.status
        : "done";
    if (status === "done" && !snapped) {
      status = evidence ? "partial" : "partial";
    }
    return {
      instruction,
      status,
      evidence: snapped || evidence,
      note:
        String(hit?.note || "").trim() ||
        (status === "done" ? "已对齐执行" : "已尝试执行，请核对正文"),
    };
  });
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
    raw.forEach((h, i) => push({ ...h, id: h.id || `h${i + 1}` }));
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
