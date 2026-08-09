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

LANGUAGE: High-quality Business English ONLY. No Chinese in coverLetter.
Structure (MANDATORY — use blank lines between paragraphs, "\\n\\n" in the JSON string):
1) Greeting paragraph (e.g. Dear Hiring Manager,)
2) Opening — role + company + interest
3) 1–2 body paragraphs — experience mapped to JD (facts only from Experience Library)
4) Closing — thanks + call to action
5) Sign-off (e.g. Yours sincerely,\\nWU XUELIAN, KACY)
Target length: 280–420 words. Formal but warm. Prefer British/HK business phrasing. Never invent facts.

${
  isRevision
    ? `=== COMMAND EXECUTION AGENT (revision round ${revisionRound}) ===
You are a Command Execution Agent for Cover Letter edits.
BASE = Current Cover Letter below (latest accepted version). Start from it; do NOT regenerate from scratch unless notes require a full rewrite.
Parse User Revision Notes into atomic commands (split by newlines / ； / ; / numbered lists).
Execute EVERY command precisely — never skip, drop, or vaguely summarize away a command.
Preserve strong JD alignment unless a command overrides it.
Output revisionAlignments[] with ONE entry per command (same order), evidence = short exact English snippet from the NEW letter proving the edit (or "" if blocked).
note / rationale fields: Simplified Chinese OK; coverLetter body: English only.`
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

Role: ${jobTitle}
Company: ${company}

【JD】
${jd.slice(0, 4500)}

【Experience Library】
${resume.slice(0, 7000)}

【Current Cover Letter — BASELINE】
${currentCoverLetter.slice(0, 6000)}

【User Revision Commands — EXECUTE EACH】
${revisionNotes.slice(0, 2500)}`
              : `Role: ${jobTitle}
Company: ${company}

【JD】
${jd.slice(0, 4500)}

【Experience】
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
