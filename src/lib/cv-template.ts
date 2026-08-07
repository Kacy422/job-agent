/**
 * A4 single-page CV — balanced typography (~10.5pt)
 * Internship: 2 STAR bullets; Projects/Leadership: 1 bullet each
 */

export const CV_SHEET_CSS = `
.cv-a4-frame {
  width: 210mm;
  height: 297mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  flex-shrink: 0;
}
.cv-sheet {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5pt;
  line-height: 1.4;
  color: #000;
  background: #fff;
  width: 210mm;
  height: 297mm;
  max-width: 100%;
  margin: 0 auto;
  padding: 12mm 13mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
}
.cv-sheet * { box-sizing: border-box; }
.cv-header {
  text-align: center;
  margin: 0 0 14px;
  flex-shrink: 0;
}
.cv-name {
  font-size: 20pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  margin: 0;
  line-height: 1.15;
}
.cv-contact {
  font-size: 10.5pt;
  margin-top: 7px;
  line-height: 1.4;
  font-weight: 400;
}
.cv-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 0;
}
.cv-section {
  margin: 0 0 16px;
  flex: 0 1 auto;
}
.cv-body > .cv-section:last-child {
  margin-bottom: 0;
}
.cv-section-title {
  font-size: 12pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  border-bottom: 2px solid #000;
  margin: 0 0 9px;
  padding: 0 0 3px;
  line-height: 1.3;
}
.cv-entry {
  margin: 0 0 11px;
}
.cv-entry:last-child {
  margin-bottom: 0;
}
.cv-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin: 0;
  width: 100%;
}
.cv-section > .cv-row + .cv-row,
.cv-section > .cv-bullets + .cv-row,
.cv-section > .cv-sub + .cv-row,
.cv-section > .cv-role + .cv-row {
  margin-top: 11px;
}
.cv-left {
  flex: 1;
  min-width: 0;
  font-size: 11pt;
  font-weight: 700;
  color: #000;
  line-height: 1.4;
}
.cv-role {
  display: block;
  font-size: 10.5pt;
  font-weight: 500;
  font-style: italic;
  margin: 2px 0 0;
  line-height: 1.4;
  color: #000;
}
.cv-left .cv-role {
  margin-top: 2px;
}
.cv-row + .cv-role {
  margin-top: 2px;
  margin-bottom: 2px;
}
.cv-right {
  flex-shrink: 0;
  text-align: right;
  white-space: nowrap;
  font-size: 10.5pt;
  font-weight: 400;
  line-height: 1.4;
}
.cv-sub {
  margin: 3px 0 5px;
  font-weight: 400;
  font-size: 10.5pt;
  line-height: 1.4;
}
.cv-bullets {
  list-style: none !important;
  margin: 4px 0 0;
  padding: 0;
  font-size: 10.5pt;
  line-height: 1.4;
}
.cv-bullets li {
  list-style: none !important;
  position: relative;
  padding-left: 13px;
  margin: 0 0 4px;
  font-size: 10.5pt;
  line-height: 1.4;
  font-weight: 400;
}
.cv-bullets li:last-child {
  margin-bottom: 0;
}
.cv-bullets li::marker {
  content: "" !important;
  display: none !important;
}
.cv-bullets li::before {
  content: "•";
  position: absolute;
  left: 0;
  top: 0;
  font-weight: 400;
  line-height: inherit;
}
.cv-skills-line {
  margin: 5px 0;
  font-size: 10.5pt;
  line-height: 1.4;
  font-weight: 400;
}
.cv-skills-line strong {
  font-weight: 700;
}

@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cv-a4-frame, .cv-sheet {
    box-shadow: none !important;
    width: 210mm !important;
    height: 297mm !important;
    overflow: hidden !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
  }
  .cv-sheet {
    padding: 12mm 13mm !important;
    transform: none !important;
  }
}
`;

export function buildEmptyCvHtml(): string {
  return `<div class="cv-sheet">
  <header class="cv-header">
    <p class="cv-name">WU XUELIAN, KACY</p>
    <p class="cv-contact">+852 65733452 &nbsp; Email: wuxuelian25@126.com</p>
  </header>
  <div class="cv-body">
    <section class="cv-section">
      <h2 class="cv-section-title">EDUCATION</h2>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">The University of Hong Kong</div>
          <div class="cv-right">Sept 2025 - Nov 2026</div>
        </div>
        <p class="cv-role">MSc in Sustainable Environmental Design | GPA: 3.8/4.0</p>
        <p class="cv-sub">Major courses: Green Building Assessment and Climate Responsive Design, Environmental Policy and Management of Megacities, Bioclimatic Architectural Design</p>
      </div>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Southwest University</div>
          <div class="cv-right">Sept 2021 - June 2025</div>
        </div>
        <p class="cv-role">B.Eng. in Landscape Architecture</p>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">INTERNSHIP EXPERIENCE</h2>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Crossroads Foundation, Hong Kong</div>
          <div class="cv-right">Dec 2025 - Now</div>
        </div>
        <p class="cv-role">Engagement Department Intern</p>
        <ul class="cv-bullets">
          <li>Conducted market research and data collection on ESG-focused companies in Mainland China, identifying potential partners, contact channels, and collaboration models to support targeted outreach and engagement strategies</li>
          <li>Worked proactively in an international NGO environment, enhancing learning agility, initiative, cultural sensitivity, and cross-cultural collaboration skills</li>
        </ul>
      </div>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Chongqing Urban Greening Management Center, Chongqing</div>
          <div class="cv-right">Jan - April 2025</div>
        </div>
        <p class="cv-role">Landscape Architect Intern</p>
        <ul class="cv-bullets">
          <li>Conducted baseline site assessments and supported landscape planning for urban greening projects, integrating public consultation insights to identify environmental constraints and opportunities in line with sustainability and ESG principles</li>
          <li>Researched local policies and regulatory frameworks related to urban greening and sustainable development, contributing to discussions on green infrastructure strategies, climate resilience, and low-impact development (LID) approaches</li>
        </ul>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">SCHOOL PROJECTS &amp; LEADERSHIP</h2>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Sustainable Architectural Design in Hong Kong</div>
          <div class="cv-right">Sept 2025 - Dec 2025</div>
        </div>
        <p class="cv-role">Independent Developer</p>
        <ul class="cv-bullets">
          <li>Developed a climate-responsive building design and conducted a preliminary BEAM Plus NB v2.0 assessment, achieving a Gold rating outcome.</li>
        </ul>
      </div>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">SWU Science Fiction Society</div>
          <div class="cv-right">Sept 2022 - Jun 2023</div>
        </div>
        <p class="cv-role">President</p>
        <ul class="cv-bullets">
          <li>Led society operations across planning, publicity and finance, and drove content design and publishing on Xiaohongshu to grow engagement.</li>
        </ul>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">SKILLS</h2>
      <p class="cv-skills-line"><strong>Software:</strong> Microsoft Office, ArcGIS, Google Earth Engine, Photoshop, Adobe Illustrator, InDesign, Adobe Premiere Pro, ENVI-met, 3D Modeling Software</p>
      <p class="cv-skills-line"><strong>Language:</strong> IELTS 7.0; CANTONESE (advanced); MANDARIN (native speaker)</p>
      <p class="cv-skills-line"><strong>Certificate:</strong> BEAM Affiliate; CFA - ESG</p>
    </section>
  </div>
</div>`;
}

export function buildFallbackCvHtml(): string {
  return buildEmptyCvHtml();
}

/** Default SKILLS lines — never leave the section empty */
export const DEFAULT_CV_SKILLS = {
  software:
    "Microsoft Office, ArcGIS, Google Earth Engine, Photoshop, Adobe Illustrator, InDesign, Adobe Premiere Pro, ENVI-met, 3D Modeling Software",
  language: "IELTS 7.0; CANTONESE (advanced); MANDARIN (native speaker)",
  certificate: "BEAM Affiliate; CFA - ESG",
} as const;

export type CvSkillsTexts = {
  software: string;
  language: string;
  certificate: string;
};

export function resolveCvSkills(
  partial?: Partial<CvSkillsTexts> | null
): CvSkillsTexts {
  return {
    software: partial?.software?.trim() || DEFAULT_CV_SKILLS.software,
    language: partial?.language?.trim() || DEFAULT_CV_SKILLS.language,
    certificate: partial?.certificate?.trim() || DEFAULT_CV_SKILLS.certificate,
  };
}

/** Three-line SKILLS block: bold labels only */
export function buildSkillsSectionHtml(
  partial?: Partial<CvSkillsTexts> | null
): string {
  const s = resolveCvSkills(partial);
  return `<section class="cv-section">
      <h2 class="cv-section-title">SKILLS</h2>
      <p class="cv-skills-line"><strong>Software:</strong> ${escapeCvText(s.software)}</p>
      <p class="cv-skills-line"><strong>Language:</strong> ${escapeCvText(s.language)}</p>
      <p class="cv-skills-line"><strong>Certificate:</strong> ${escapeCvText(s.certificate)}</p>
    </section>`;
}

function escapeCvText(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractSkillsLineValue(html: string, label: string): string {
  const re = new RegExp(
    `<p[^>]*class="[^"]*cv-skills-line[^"]*"[^>]*>\\s*(?:<strong>)?\\s*${label}\\s*:\\s*(?:</strong>)?\\s*([\\s\\S]*?)</p>`,
    "i"
  );
  const m = html.match(re);
  if (!m) return "";
  return m[1]
    .replace(/<\/?strong>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Force a complete SKILLS section with Software / Language / Certificate.
 * Preserves non-empty extracted values; fills defaults for any missing line.
 */
export function ensureSkillsSection(
  html: string,
  overrides?: Partial<CvSkillsTexts> | null
): string {
  if (!html.trim()) return html;
  let out = html;

  // Fold stray CERTIFICATES section into certificate text before rebuild
  let certFromSection = "";
  out = out.replace(
    /<section[^>]*>\s*<h2[^>]*>\s*CERTIFICATES?\s*<\/h2>([\s\S]*?)<\/section>/gi,
    (_m, body: string) => {
      certFromSection = String(body)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^Certificate\s*:\s*/i, "")
        .trim();
      return "";
    }
  );

  const fromHtml: Partial<CvSkillsTexts> = {
    software: extractSkillsLineValue(out, "Software"),
    language: extractSkillsLineValue(out, "Language"),
    certificate:
      extractSkillsLineValue(out, "Certificate") ||
      extractSkillsLineValue(out, "Certifications") ||
      certFromSection,
  };

  const skills = resolveCvSkills({
    software: overrides?.software || fromHtml.software,
    language: overrides?.language || fromHtml.language,
    certificate: overrides?.certificate || fromHtml.certificate,
  });
  const block = buildSkillsSectionHtml(skills);

  if (
    /<section[^>]*>\s*<h2[^>]*>\s*SKILLS\s*<\/h2>[\s\S]*?<\/section>/i.test(out)
  ) {
    out = out.replace(
      /<section[^>]*>\s*<h2[^>]*>\s*SKILLS\s*<\/h2>[\s\S]*?<\/section>/i,
      block
    );
  } else if (/<h2[^>]*>\s*SKILLS\s*<\/h2>/i.test(out)) {
    // Bare h2 without wrapping section — replace from h2 through next section or end of body
    out = out.replace(
      /<h2[^>]*>\s*SKILLS\s*<\/h2>[\s\S]*?(?=<section\b|<h2\b|<\/div>\s*<\/div>)/i,
      block
    );
  } else if (/<\/div>\s*<\/div>\s*$/i.test(out)) {
    out = out.replace(/<\/div>\s*<\/div>\s*$/i, `${block}</div></div>`);
  } else {
    out = `${out}\n${block}`;
  }

  // Absolute guarantee
  if (
    !/<strong>\s*Software\s*:/i.test(out) ||
    !/<strong>\s*Language\s*:/i.test(out) ||
    !/<strong>\s*Certificate\s*:/i.test(out)
  ) {
    if (
      /<section[^>]*>\s*<h2[^>]*>\s*SKILLS\s*<\/h2>[\s\S]*?<\/section>/i.test(
        out
      )
    ) {
      out = out.replace(
        /<section[^>]*>\s*<h2[^>]*>\s*SKILLS\s*<\/h2>[\s\S]*?<\/section>/i,
        block
      );
    } else {
      out = `${out}\n${block}`;
    }
  }

  return out;
}

/** Keep at most N <li> items per cv-bullets list inside a matching section */
export function enforceBulletsInSection(
  html: string,
  titleRe: RegExp,
  maxBullets: number
): string {
  return html.replace(
    /(<h2[^>]*>)([\s\S]*?)(<\/h2>)([\s\S]*?)(?=<h2\b|$)/gi,
    (full, open: string, titleInner: string, close: string, body: string) => {
      if (!titleRe.test(titleInner.replace(/<[^>]+>/g, " "))) return full;
      const trimmed = body.replace(
        /(<ul[^>]*class="[^"]*cv-bullets[^"]*"[^>]*>)([\s\S]*?)(<\/ul>)/gi,
        (_u, ulOpen: string, inner: string, ulClose: string) => {
          const items = [...inner.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)].map(
            (m) => m[0]
          );
          return `${ulOpen}${items.slice(0, maxBullets).join("")}${ulClose}`;
        }
      );
      return `${open}${titleInner}${close}${trimmed}`;
    }
  );
}

/** Keep at most 2 <li> per internship/work entry's bullet list */
export function enforceTwoInternshipBullets(html: string): string {
  return enforceBulletsInSection(html, /INTERNSHIP|WORK EXPERIENCE/i, 2);
}

/** Projects / leadership: exactly 1 bullet per entry */
export function enforceOneProjectBullet(html: string): string {
  return enforceBulletsInSection(html, /PROJECTS|LEADERSHIP/i, 1);
}

export const CV_HTML_SCHEMA_HINT = `Return HTML rooted in <div class="cv-sheet"> that FILLS exactly ONE A4 page (no overflow):

=== Structure ===
header.cv-header (p.cv-name + p.cv-contact) + div.cv-body with sections:
EDUCATION → INTERNSHIP EXPERIENCE → (SCHOOL PROJECTS & LEADERSHIP OR PROJECTS & OTHER EXPERIENCES) → SKILLS
Do NOT create a CERTIFICATES section heading.

=== Entry pattern (EVERY internship / project / leadership item) ===
Wrap each item in <div class="cv-entry">:
1) Top row ONLY (flex space-between):
   <div class="cv-row">
     <div class="cv-left">ORG_OR_PROJECT_NAME</div>
     <div class="cv-right">DATE_RANGE</div>
   </div>
2) Role / identity on the NEXT line (NOT inside cv-left):
   <p class="cv-role">Role Title</p>
3) Then bullets:
   <ul class="cv-bullets"><li>…</li></ul>

=== INTERNSHIP / WORK BULLETS (STAR-style, MANDATORY) ===
- cv-left MUST be exactly: "Company/Organization Name, City"
- cv-right = dates; cv-role = title only
- EACH internship/work entry: EXACTLY 2 bullets (merge similar duties; ban fragmented micro-lists).
- Every bullet MUST follow: Action Verb + Task/Context + Tools/Methods + Quantifiable Impact/Value
- Fluency: idiomatic HK Business English, tightly matched to Target JD. Never invent metrics.

=== PROJECTS / LEADERSHIP (critical) ===
- Section title: "SCHOOL PROJECTS & LEADERSHIP" OR "PROJECTS & OTHER EXPERIENCES"
- EACH project / leadership entry: EXACTLY 1 bullet only — the single strongest outcome / leadership result.
- Merge any secondary duties into that one high-impact line.
- cv-left = name; cv-right = date range (REQUIRED — never leave empty); cv-role = identity
- For "Sustainable Architectural Design in Hong Kong", use dates e.g. "Sept 2025 - Dec 2025" if present in the library (or the library period).

=== Education ===
- cv-left = school; cv-right = dates
- For HKU MSc: <p class="cv-role">MSc in Sustainable Environmental Design | GPA: 3.8/4.0</p>
- Then <p class="cv-sub">Major courses: …</p> from the COURSE POOL

=== SKILLS (REQUIRED — three lines) ===
Exact pattern (bold labels ONLY; values in normal weight — never bold software/language/certificate names):
  <p class="cv-skills-line"><strong>Software:</strong> Microsoft Office, ArcGIS, Google Earth Engine, Photoshop, Adobe Illustrator, InDesign, Adobe Premiere Pro, ENVI-met, 3D Modeling Software</p>
  <p class="cv-skills-line"><strong>Language:</strong> IELTS 7.0; CANTONESE (advanced); MANDARIN (native speaker)</p>
  <p class="cv-skills-line"><strong>Certificate:</strong> BEAM Affiliate; CFA - ESG</p>
- Spell "Certificate" correctly (never "Ceitificate"). NEVER use <h2>CERTIFICATES</h2>

=== Chinese source content (MANDATORY) ===
- Translate Chinese library/notes into Professional Resume English and INCLUDE the facts. Never drop Chinese-only content.

=== Single-page A4 ===
- ~10.5pt body with line-height 1.4. Fill the page evenly via substantive internship bullets + balanced spacing; stay on one page.

=== Rules ===
- Classes ONLY: cv-section, cv-section-title, cv-entry, cv-row, cv-left, cv-role, cv-right, cv-bullets, cv-skills-line, cv-sub
- NEVER put • / ● / - inside <li>
- Output English only in HTML. Never invent facts. No <style>/markdown.`;
