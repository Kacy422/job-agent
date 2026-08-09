import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";
import { normalizeCoverLetterText } from "@/lib/cover-letter";

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
    const resume = String(body.resume || "").trim();
    const company = String(body.company || "the company").trim();
    const jobTitle = String(body.jobTitle || "the role").trim();
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
    if (isRevision === false && !jd) {
      /* noop — already checked */
    }

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content: `You write Cover Letters for the Hong Kong job market (MNC / local professional firms).

=== FACT BINDING (ABSOLUTE — NEVER VIOLATE) ===
- Use ONLY experiences, projects, tools, certificates, and skills that EXIST in the Experience Library / Profile Data.
- FORBIDDEN: inventing, exaggerating, or "JD-padding" skills, software, metrics, employers, or outcomes not in the library.
- If the JD asks for a skill/tool the candidate does NOT have: do NOT fabricate it. Instead briefly emphasize a closely related TRANSFERABLE skill that IS grounded in the library (e.g. research discipline, stakeholder coordination, data handling, ESG analysis practice). If nothing transferable fits, simply omit that JD item.
- Prefer understatement over overclaim. Every claim must be traceable to Profile Data.

=== LANGUAGE ===
- coverLetter: High-quality Business English ONLY (no Chinese).
- Style: Crisp, professional, short sentences. Delete decorative fluff, filler transitions, and long compound sentences.
- Prefer British/HK business phrasing where natural.

=== LENGTH (HARD LIMIT) ===
- Body word count MUST be 180–220 words (exclude greeting + sign-off lines from the mental budget if needed, but total letter should still feel half-page).
- Target ~200 words. NEVER exceed 220 words of prose. If over, cut body first.

=== STRUCTURE (MANDATORY — "\\n\\n" between blocks) ===
0) Greeting only: Dear Hiring Manager,
1) INTRO (1 paragraph, 1–2 sentences): State the exact role + company and the single strongest, library-true advantage.
2) BODY (1 paragraph): Pick ONLY 1–2 most JD-relevant real experiences/projects from the library. In lean language show how they meet the role — no laundry list, no invented tools.
3) OUTRO (1 paragraph, 1–2 sentences): Interview interest + polite thanks. No lengthy closing rhetoric.
4) Sign-off: Yours sincerely,\\nWU XUELIAN, KACY

${
  isRevision
    ? `=== COMMAND EXECUTION AGENT (revision round ${revisionRound}) ===
BASE = Current Cover Letter. Edit incrementally; do not regenerate from scratch unless notes require it.
Keep 180–220 words and the 3-paragraph structure unless the user explicitly overrides.
FACT BINDING still applies — never invent skills to satisfy a revision note; use transferable library-true strengths instead.
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
硬性约束：正文保持 180–220 词；严禁虚构履历中不存在的技能/软件/成果；缺项用可迁移能力。

Role: ${jobTitle}
Company: ${company}

【JD】
${jd.slice(0, 4500)}

【Experience Library / Profile Data — ONLY allowed facts】
${resume.slice(0, 7000)}

【Current Cover Letter — BASELINE】
${currentCoverLetter.slice(0, 6000)}

【User Revision Commands — EXECUTE EACH】
${revisionNotes.slice(0, 2500)}`
              : `请撰写 Cover Letter（正文硬性 180–220 词，约半页）：
- 严禁虚构/夸大履历中没有的技能、软件或成果；JD 缺项时只用履历内可迁移能力，不可捏造。
- 3 段式：Intro 1–2 句点明岗位与核心优势；Body 仅 1–2 个真实核心经历说明匹配；Outro 1–2 句面试意向与致谢。
- 删修饰废话与长难句，干练专业。

Role: ${jobTitle}
Company: ${company}

【JD】
${jd.slice(0, 4500)}

【Experience Library / Profile Data — ONLY allowed facts】
${resume.slice(0, 7000)}`,
          },
        ],
        {
          json: true,
          temperature: isRevision ? 0.25 : 0.45,
          timeoutMs: isRevision ? 120_000 : 90_000,
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
