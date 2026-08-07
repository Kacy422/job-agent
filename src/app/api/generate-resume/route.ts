import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";
import {
  CV_HTML_SCHEMA_HINT,
  buildFallbackCvHtml,
  enforceOneProjectBullet,
  enforceTwoInternshipBullets,
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

=== STEP B — GROUNDED STAR REWRITE ===
Rewrite ONLY using facts from the candidate's Full Experience Library.
- Map library material to JD keywords / pain points (rephrase & prioritise; never invent employers, degrees, dates, or metrics).
- MERGE similar / fragmented duties into clear themes — ban laundry-list micro-bullets.
- Internship / Work: EXACTLY 2 core STAR bullets per entry (Verb + Task + Tools + Impact); merge fragmented duties.
- Projects / Leadership: EXACTLY 1 high-impact bullet per entry; always fill cv-right dates (e.g. Sept 2025 - Dec 2025 for Sustainable Architectural Design in Hong Kong).
- Fluency: idiomatic, coherent Professional Resume English tightly matched to the Target JD.
- Fill one A4 page evenly — avoid large empty gaps and avoid page-2 overflow.

LANGUAGE RULE (MANDATORY):
- Final tailoredResumeHtml MUST be Professional Resume English for Hong Kong applications (no Chinese characters in the HTML).
- If the Full Experience Library, JD, or revision notes contain Chinese: NEVER discard those facts. First translate them accurately into idiomatic Professional Resume English, then weave the meaning into bullets / education / skills fields.
- rationale: Simplified Chinese only (internal notes).

Output STRICT JSON only (no markdown fences):
{
  "tailoredResumeHtml": "<div class=\\"cv-sheet\\">...</div>",
  "rationale": {
    "added": [{"text":"增加的内容","reason":"简明原因"}],
    "removed": [{"text":"删减的内容","reason":"简明原因"}]
  },
  "highlights": [
    {"id":"h1","kind":"added","phrase":"exact English substring copied from tailoredResumeHtml","label":"中文简述","reason":"简明原因"},
    {"id":"h2","kind":"changed","phrase":"another exact English phrase from the HTML","label":"中文简述","reason":"简明原因"}
  ]
}

=== HTML layout ===
${CV_HTML_SCHEMA_HINT}
Prefer sections: EDUCATION, INTERNSHIP EXPERIENCE, then SCHOOL PROJECTS & LEADERSHIP or PROJECTS & OTHER EXPERIENCES, then SKILLS.
SKILLS MUST include Software / Language / Certificate with bold labels ONLY and normal-weight values, e.g.
<p class="cv-skills-line"><strong>Certificate:</strong> BEAM Affiliate; CFA - ESG</p>
(spell Certificate correctly — never "Ceitificate").
Internship: EXACTLY 2 STAR bullets (Verb + Task + Tools + Impact).
Projects/Leadership: EXACTLY 1 bullet per entry; always include a date on cv-right (e.g. Sustainable Architectural Design in Hong Kong → Sept 2025 - Dec 2025).
HKU degree line MUST include inline GPA: "MSc … | GPA: X.X/Y.Y".
Chinese source text → translate to English and KEEP the facts.

${coursePoolPromptBlock()}

=== rationale (Simplified Chinese only) ===
- added【增加】: 1–3 items {text, reason} — new JD keywords / metrics / stronger verbs you emphasised.
- removed【减少】: 1–2 items {text, reason} — what you cut as low relevance.
Keep ultra-concise. No English / Traditional Chinese in rationale.

=== highlights (for Word-style review UI) ===
- 2–4 items. Each "phrase" MUST be copied VERBATIM from tailoredResumeHtml (English text that appears in the CV body).
- kind: "added" | "changed" only (do not invent phrases that are absent from the HTML).
- label + reason: Simplified Chinese.

${
  isRevision
    ? `=== REVISION MODE ===
You are refining an EXISTING tailored CV. Respect the current HTML structure/classes.
Apply the user's revision notes precisely while staying grounded in the experience library and JD.
Do not discard strong JD alignment already present unless the notes require it.
If revision notes are in Chinese, translate the intent into English CV edits — never ignore Chinese notes.`
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
        highlights?: CvApiHighlight[];
      }>(content);

      const html = normalizeHtml(parsed.tailoredResumeHtml || "");
      const rationale = ensureRationale(
        normalizeCvRationale(parsed.rationale ?? parsed.rationaleList)
      );
      const highlights = normalizeHighlights(parsed.highlights, html);

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
        const demoHtml = currentCvHtml || buildFallbackCvHtml();
        return NextResponse.json({
          tailoredResumeHtml: demoHtml,
          rationale: demoRationale,
          rationaleList: flattenRationale(demoRationale),
          highlights: [
            {
              id: "h1",
              kind: "added",
              phrase: "ESG",
              label: "ESG / 气候韧性关键词",
              reason: "演示模式示意匹配 JD",
            },
          ],
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

function normalizeHighlights(
  raw: CvApiHighlight[] | undefined,
  html: string
): CvApiHighlight[] {
  if (!Array.isArray(raw)) return [];
  const plain = html.replace(/<[^>]+>/g, " ");
  return raw
    .map((h, i) => {
      const phrase = String(h?.phrase || "").trim();
      if (phrase.length < 2) return null;
      if (!plain.toLowerCase().includes(phrase.toLowerCase())) return null;
      return {
        id: String(h?.id || `h${i + 1}`),
        kind: h?.kind === "changed" ? "changed" : "added",
        phrase,
        label: String(h?.label || "").trim(),
        reason: String(h?.reason || "").trim(),
      } satisfies CvApiHighlight;
    })
    .filter(Boolean) as CvApiHighlight[];
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
  // Fix common certificate label misspellings (incl. Ceitificate)
  html = html.replace(/\bCeitificates?\s*:/gi, "Certificate:");
  html = html.replace(/\bCe[rt]{1,2}ificates?\s*:/gi, "Certificate:");
  html = html.replace(/\bCertifications?\s*:/gi, "Certificate:");
  // Normalize CERTIFICATES section → Certificate skills line (bold label only)
  html = html.replace(
    /<section[^>]*>\s*<h2[^>]*>\s*CERTIFICATES?\s*<\/h2>([\s\S]*?)<\/section>/gi,
    (_m, body: string) => {
      const line = String(body)
        .replace(/<\/?p[^>]*>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^Certificate\s*:\s*/i, "")
        .trim();
      if (!line) return "";
      return formatCertificateSkillsLine(line);
    }
  );
  // Any Certificate skills line → bold label + normal-weight names
  html = html.replace(
    /<p class="cv-skills-line">[\s\S]*?Certificate\s*:[\s\S]*?<\/p>/gi,
    (full) => {
      const text = full
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^[\s\S]*?Certificate\s*:/i, "")
        .trim();
      if (!text) {
        return formatCertificateSkillsLine("BEAM Affiliate; CFA - ESG");
      }
      return formatCertificateSkillsLine(text);
    }
  );
  // Strip accidental <strong> around Software/Language values (keep label bold)
  html = html.replace(
    /(<p class="cv-skills-line"><strong>(Software|Language):<\/strong>)\s*((?:<strong>[^<]+<\/strong>\s*[;，,]?\s*)+)(<\/p>)/gi,
    (_m, open: string, _label: string, inner: string, close: string) => {
      const plain = inner
        .replace(/<\/?strong>/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return `${open} ${plain}${close}`;
    }
  );
  // Bold-only certificate name lines (no Certificate label) → full format
  html = html.replace(
    /<p class="cv-skills-line">\s*(?:<strong>(?!Software:|Language:|Certificate:)([^<]+)<\/strong>\s*[;，,]?\s*)+<\/p>/gi,
    (full) => {
      if (/Certificate\s*:/i.test(full)) return full;
      const names = [...full.matchAll(/<strong>([^<]+)<\/strong>/gi)]
        .map((m) => m[1].trim())
        .filter(Boolean);
      if (!names.length) return full;
      return formatCertificateSkillsLine(names.join("; "));
    }
  );
  // Ensure SKILLS section always has a Certificate line
  if (
    /<h2[^>]*>\s*SKILLS\s*<\/h2>/i.test(html) &&
    !/Certificate\s*:/i.test(html)
  ) {
    html = html.replace(
      /(<h2[^>]*>\s*SKILLS\s*<\/h2>)([\s\S]*?)(<\/section>)/i,
      (_m, title: string, body: string, close: string) =>
        `${title}${body}${formatCertificateSkillsLine(
          "BEAM Affiliate; CFA - ESG"
        )}${close}`
    );
  }
  html = enforceTwoInternshipBullets(html);
  html = enforceOneProjectBullet(html);
  return html;
}

/** Bold label only; certificate names in normal weight */
function formatCertificateSkillsLine(rawNames: string): string {
  const names = rawNames
    .split(/[;，,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^Certificate\s*:\s*/i, "").trim())
    .filter(Boolean);
  const list = (names.length ? names : ["BEAM Affiliate", "CFA - ESG"]).join(
    "; "
  );
  return `<p class="cv-skills-line"><strong>Certificate:</strong> ${list}</p>`;
}
