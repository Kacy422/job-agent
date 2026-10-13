/**
 * Cover-letter experience payload helpers.
 * Ensures internship / work blocks (e.g. Neuralis Consulting) are not truncated away.
 */

const EMPLOYER_HINT =
  /Neuralis|Consulting|Intern|Foundation|Center|Centre|Ltd|Limited|Company|Group|Bank|Corp/i;

/** Pull ## Internship / Work sections to the front so they survive token windows. */
export function prioritizeExperienceForCoverLetter(resume: string): string {
  const raw = String(resume || "").trim();
  if (!raw) return "";

  const sections = raw.split(/(?=^##\s)/m).map((s) => s.trim()).filter(Boolean);
  if (sections.length <= 1) return raw;

  const score = (block: string) => {
    const h = (block.match(/^##\s*(.+)$/m)?.[1] || "").toLowerCase();
    if (/internship|work experience|employment|professional experience/.test(h))
      return 0;
    if (/project|leadership/.test(h)) return 2;
    if (/education|gpa|skills|contact|quick notes/.test(h)) return 3;
    if (EMPLOYER_HINT.test(block)) return 1;
    return 2;
  };

  return [...sections]
    .sort((a, b) => score(a) - score(b))
    .join("\n\n")
    .trim();
}

/** List employer / org headlines found under internship-like blocks. */
export function listInternshipEmployers(resume: string): string[] {
  const text = String(resume || "");
  const names: string[] = [];
  const re =
    /Organization\/School\/Project \(bold on left\):\s*(.+)|(?:^|\n)##\s*Internship[^\n]*\n([\s\S]*?)(?=\n##\s|\n*$)/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) {
      const n = m[1].trim();
      if (n && !names.includes(n)) names.push(n);
    }
  }
  // Also catch bare employer lines common in pasted CVs
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^Neuralis\b/i.test(t) && !names.some((n) => /neuralis/i.test(n))) {
      names.push(t.replace(/\s*[|·].*$/, "").trim());
    }
  }
  return names;
}

export const COVER_WORD_OPTIONS = [200, 500, 1000] as const;
export type CoverWordTarget = (typeof COVER_WORD_OPTIONS)[number];

export function normalizeCoverWordTarget(raw: unknown): CoverWordTarget {
  const n = Number(raw);
  if (n === 500 || n === 1000) return n;
  return 200;
}

export function coverWordBudget(target: CoverWordTarget): {
  min: number;
  max: number;
  label: string;
} {
  if (target === 1000) return { min: 900, max: 1100, label: "~1000 words" };
  if (target === 500) return { min: 450, max: 550, label: "~500 words" };
  return { min: 180, max: 220, label: "~200 words" };
}
