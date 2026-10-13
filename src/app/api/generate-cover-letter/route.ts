import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";
import { normalizeCoverLetterText } from "@/lib/cover-letter";
import {
  coverWordBudget,
  listInternshipEmployers,
  normalizeCoverWordTarget,
  prioritizeExperienceForCoverLetter,
} from "@/lib/cover-letter-experience";

export type CoverRevisionAlignment = {
  instruction: string;
  status: "done" | "partial" | "blocked";
  evidence: string;
  note: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resumeRaw = String(body.resume || "").trim();
    const resume = prioritizeExperienceForCoverLetter(resumeRaw);
    const company = String(body.company || "the company").trim();
    const jobTitle = String(body.jobTitle || "the role").trim();
    const targetWords = normalizeCoverWordTarget(body.targetWords);
    const budget = coverWordBudget(targetWords);
    const employers = listInternshipEmployers(resume);
    const employerHint = employers.length
      ? employers.join("; ")
      : "(see Experience Library)";
    const currentCoverLetter = normalizeCoverLetterText(
      String(body.currentCoverLetter || "")
    );
    const revisionNotes = String(body.revisionNotes || "").trim();
    const revisionRound = Math.max(
      1,
      Number(body.revisionRound) ||
        (currentCoverLetter && revisionNotes ? 2 : 1)
    );
    const isRevision = Boolean(revisionNotes && currentCoverLetter);

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供 JD 与全量经历" },
        { status: 400 }
      );
    }

    const bodyParagraphRule =
      targetWords >= 1000
        ? `BODY (2–3 paragraphs): Cover EVERY substantive internship / work employer listed in the Experience Library (including Neuralis Consulting if present). For each, cite concrete duties/outcomes from the library and map them to JD needs.`
        : targetWords >= 500
          ? `BODY (2 paragraphs): Include ALL key internship / work employers from the library (must not drop Neuralis Consulting or any other listed employer). Allocate sentences so each employer appears with at least one grounded achievement.`
          : `BODY (1–2 paragraphs): Prefer the strongest JD-aligned internship/work experiences. If Neuralis Consulting (or any other named internship employer) appears in the library, you MUST include it unless the user explicitly asks to omit it — do not silently drop it for brevity.`;

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content: `You write Cover Letters for the Hong Kong job market (MNC / local professional firms).

=== FACT BINDING (ABSOLUTE — NEVER VIOLATE) ===
- Use ONLY experiences, projects, tools, certificates, and skills that EXIST in the Experience Library / Profile Data.
- FORBIDDEN: inventing, exaggerating, or "JD-padding" skills, software, metrics, employers, or outcomes not in the library.
- If the JD asks for a skill/tool the candidate does NOT have: do NOT fabricate it. Instead briefly emphasize a closely related TRANSFERABLE skill that IS grounded in the library.
- Prefer understatement over overclaim. Every claim must be traceable to Profile Data.

=== EMPLOYER COVERAGE (CRITICAL) ===
- Detected internship / work employers in the library: ${employerHint}
- NEVER silently omit a listed internship/work employer (especially "Neuralis Consulting") when writing the letter.
- At ${budget.label}, follow the BODY rules below; still keep every claim library-true.

=== LANGUAGE ===
- coverLetter: High-quality Business English ONLY (no Chinese).
- Style: Crisp, professional. Prefer British/HK business phrasing where natural.

=== LENGTH (HARD LIMIT — USER SELECTED) ===
- Target body word count: ${budget.label} (about ${targetWords} words).
- Acceptable range: ${budget.min}–${budget.max} words of prose (greeting + sign-off may sit outside the mental budget, but total should match the selected length).
- Do NOT default to ~200 words when the user selected ${targetWords}.

=== STRUCTURE (MANDATORY — "\\n\\n" between blocks) ===
0) Greeting only: Dear Hiring Manager,
1) INTRO (1 paragraph): State the exact role + company and the strongest library-true advantage.
2) ${bodyParagraphRule}
3) OUTRO (1 paragraph): Interview interest + polite thanks.
4) Sign-off: Yours sincerely,\\nWU XUELIAN, KACY

${
  isRevision
    ? `=== COMMAND EXECUTION AGENT (revision round ${revisionRound}) ===
BASE = Current Cover Letter. Edit incrementally; do not regenerate from scratch unless notes require it.
Keep ${budget.min}–${budget.max} words unless the user explicitly overrides length.
Preserve employer coverage (do not delete Neuralis Consulting / other internship employers unless the user asks).
FACT BINDING still applies.
Parse User Revision Notes into atomic commands; execute EVERY command; never skip.
Output revisionAlignments[] (one per command, same order) with evidence = exact English snippet from the NEW letter (or "").
note: Simplified Chinese OK; coverLetter: English only.`
    : ""
}

Output STRICT JSON only:
{
  "coverLetter": "full letter with \\\\n\\\\n between paragraphs"${
    isRevision
      ? `,
  "revisionAlignments": [
    {"instruction":"用户原指令","status":"done","evidence":"exact English snippet","note":"落地说明"}
  ]`
      : ""
  }
}`,
          },
          {
            role: "user",
            content: isRevision
              ? `【Revision Round】${revisionRound}

作为 Command Execution Agent，逐条执行修改指令，基于当前 Cover Letter 增量改写。
硬性约束：正文保持 ${budget.min}–${budget.max} 词（用户选择约 ${targetWords} 词）；严禁虚构履历中不存在的技能/软件/成果；不得无故删掉 Neuralis Consulting 或其他实习/工作雇主。

Role: ${jobTitle}
Company: ${company}
Target words: ${targetWords}

【JD】
${jd.slice(0, 4500)}

【Experience Library / Profile Data — ONLY allowed facts】
${resume.slice(0, 14000)}

【Current Cover Letter — BASELINE】
${currentCoverLetter.slice(0, 8000)}

【User Revision Commands — EXECUTE EACH】
${revisionNotes.slice(0, 2500)}`
              : `请撰写 Cover Letter（用户指定约 ${targetWords} 词，允许 ${budget.min}–${budget.max}）：
- 严禁虚构/夸大履历中没有的技能、软件或成果。
- 实习/工作雇主（含 Neuralis Consulting，若出现在履历中）不得无故省略。
- 结构：Intro → Body（按字数覆盖关键雇主）→ Outro → Sign-off。

Role: ${jobTitle}
Company: ${company}
Target words: ${targetWords}

【JD】
${jd.slice(0, 4500)}

【Experience Library / Profile Data — ONLY allowed facts】
${resume.slice(0, 14000)}`,
          },
        ],
        {
          json: true,
          temperature: isRevision ? 0.25 : 0.45,
          timeoutMs: isRevision || targetWords >= 500 ? 120_000 : 90_000,
        }
      );

      const parsed = extractJson<{
        coverLetter?: string;
        revisionAlignments?: CoverRevisionAlignment[];
      }>(content);
      const coverLetter = normalizeCoverLetterText(
        String(parsed.coverLetter || "")
      );
      if (!coverLetter) {
        return NextResponse.json(
          { error: "未返回 Cover Letter" },
          { status: 502 }
        );
      }

      const revisionAlignments = isRevision
        ? normalizeAlignments(
            parsed.revisionAlignments,
            revisionNotes,
            coverLetter
          )
        : undefined;

      return NextResponse.json({
        coverLetter,
        revisionAlignments,
        revisionRound,
        targetWords,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "MISSING_API_KEY") {
        const demo = normalizeCoverLetterText(
          currentCoverLetter ||
            `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}. My background aligns with the role requirements described in the job posting, and I would welcome the opportunity to contribute.\n\nThank you for your consideration.\n\nSincerely,\nWU XUELIAN, KACY`
        );
        return NextResponse.json({
          coverLetter: demo,
          revisionAlignments: isRevision
            ? normalizeAlignments(undefined, revisionNotes, demo)
            : undefined,
          revisionRound,
          targetWords,
          demo: true,
        });
      }
      if (message === "DEEPSEEK_TIMEOUT") {
        return NextResponse.json(
          { error: "生成超时，请重试（将基于当前 Cover Letter 继续）" },
          { status: 504 }
        );
      }
      console.error(err);
      return NextResponse.json({ error: "生成失败" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}

function splitCommands(notes: string): string[] {
  return notes
    .split(/\n+|；|;|。(?=\S)|(?<=\d)[.)、]\s*/)
    .map((s) => s.replace(/^\s*[-•*\d.)、]+\s*/, "").trim())
    .filter((s) => s.length >= 2);
}

function normalizeAlignments(
  raw: CoverRevisionAlignment[] | undefined,
  notes: string,
  letter: string
): CoverRevisionAlignment[] {
  const cmds = splitCommands(notes);
  const list = Array.isArray(raw) ? raw : [];
  return cmds.map((instruction, i) => {
    const hit = list[i];
    const evidence = String(hit?.evidence || "").trim();
    const found =
      evidence && letter.toLowerCase().includes(evidence.toLowerCase());
    let status: CoverRevisionAlignment["status"] =
      hit?.status === "partial" || hit?.status === "blocked"
        ? hit.status
        : "done";
    if (status === "done" && evidence && !found) status = "partial";
    return {
      instruction,
      status,
      evidence: found ? evidence : evidence,
      note:
        String(hit?.note || "").trim() ||
        (status === "done" ? "已对齐执行" : "已尝试执行，请核对正文"),
    };
  });
}
