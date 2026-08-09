/**
 * A4 single-page CV — compact defaults (~10.5pt), CSS vars for live typography
 * Sections distribute evenly; Company | Role stays single-line
 * Internship: 2–4 STAR bullets (prefer 3); Projects/Leadership: 1 bullet each
 */

export const CV_FONT_SIZE_OPTIONS = [10, 10.5, 11, 12] as const;
export type CvFontSizePt = (typeof CV_FONT_SIZE_OPTIONS)[number];

export const CV_LINE_PRESETS = {
  tight: 1.15,
  normal: 1.28,
  loose: 1.45,
} as const;
export type CvLinePreset = keyof typeof CV_LINE_PRESETS;

/** Default typography — compact, even A4 fill */
export const CV_TYPOGRAPHY_DEFAULTS = {
  fontSizePt: 10.5 as CvFontSizePt,
  lineHeight: CV_LINE_PRESETS.normal,
};

/**
 * Runtime override injected after CV_SHEET_CSS (preview + PDF/Word export).
 * Uses CSS variables so hierarchy stays intact while size/leading scale.
 */
export function buildCvTypographyCss(
  fontSizePt: number = CV_TYPOGRAPHY_DEFAULTS.fontSizePt,
  lineHeight: number = CV_TYPOGRAPHY_DEFAULTS.lineHeight
): string {
  const size = Number.isFinite(fontSizePt) ? fontSizePt : 10.5;
  const lh = Number.isFinite(lineHeight) ? lineHeight : 1.28;
  const nameSize = Math.min(22, Math.max(18, size + 9));
  const titleSize = Math.min(12.5, Math.max(11, size + 1));
  const leftSize = Math.min(12, Math.max(10.5, size + 0.5));
  const liGap = lh <= 1.2 ? "2px" : lh >= 1.4 ? "5px" : "3px";
  const sectionPad = lh <= 1.2 ? "4px" : lh >= 1.4 ? "8px" : "6px";
  const entryGap = lh <= 1.2 ? "6px" : lh >= 1.4 ? "10px" : "8px";
  return `
.cv-sheet {
  --cv-body-size: ${size}pt;
  --cv-line: ${lh};
  --cv-name-size: ${nameSize}pt;
  --cv-title-size: ${titleSize}pt;
  --cv-left-size: ${leftSize}pt;
  --cv-li-gap: ${liGap};
  --cv-section-pad: ${sectionPad};
  --cv-entry-gap: ${entryGap};
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
}
.cv-name { font-size: var(--cv-name-size); }
.cv-contact,
.cv-role,
.cv-right,
.cv-sub,
.cv-bullets,
.cv-bullets li,
.cv-skills-line {
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
}
.cv-section-title { font-size: var(--cv-title-size); }
.cv-left { font-size: var(--cv-left-size); line-height: var(--cv-line); }
.cv-bullets li { margin-bottom: var(--cv-li-gap); }
.cv-entry { margin-bottom: var(--cv-entry-gap); }
.cv-body > .cv-section + .cv-section { padding-top: var(--cv-section-pad); }
`;
}

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
  --cv-body-size: 10.5pt;
  --cv-line: 1.28;
  --cv-name-size: 19.5pt;
  --cv-title-size: 11.5pt;
  --cv-left-size: 11pt;
  --cv-li-gap: 3px;
  --cv-section-pad: 6px;
  --cv-entry-gap: 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
  color: #000;
  background: #fff;
  width: 210mm;
  height: 297mm;
  max-width: 100%;
  margin: 0 auto;
  padding: 10mm 12mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
}
.cv-sheet * { box-sizing: border-box; }
.cv-header {
  text-align: center;
  margin: 0 0 10px;
  flex-shrink: 0;
}
.cv-name {
  font-size: var(--cv-name-size);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  margin: 0;
  line-height: 1.12;
}
.cv-contact {
  font-size: var(--cv-body-size);
  margin-top: 4px;
  line-height: var(--cv-line);
  font-weight: 400;
}
/* Even section distribution across A4 body height */
.cv-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0;
  min-height: 0;
}
.cv-section {
  margin: 0;
  flex: 0 0 auto;
  padding: 0;
}
.cv-body > .cv-section + .cv-section {
  margin-top: 0;
  padding-top: var(--cv-section-pad);
}
.cv-body > .cv-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
}
.cv-section-title {
  font-size: var(--cv-title-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  border-bottom: 1.5px solid #000;
  margin: 0 0 6px;
  padding: 0 0 2px;
  line-height: 1.25;
}
.cv-entry {
  margin: 0 0 var(--cv-entry-gap);
}
.cv-entry:last-child {
  margin-bottom: 0;
}
.cv-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  width: 100%;
}
.cv-section > .cv-row + .cv-row,
.cv-section > .cv-bullets + .cv-row,
.cv-section > .cv-sub + .cv-row,
.cv-section > .cv-role + .cv-row {
  margin-top: 7px;
}
.cv-left {
  flex: 1;
  min-width: 0;
  font-size: var(--cv-left-size);
  font-weight: 700;
  color: #000;
  line-height: var(--cv-line);
}
/* Role italic after " | " when Company | Role share one line */
.cv-role-inline {
  font-weight: 500;
  font-style: italic;
}
.cv-role {
  display: block;
  font-size: var(--cv-body-size);
  font-weight: 500;
  font-style: italic;
  margin: 1px 0 0;
  line-height: var(--cv-line);
  color: #000;
}
.cv-left .cv-role {
  margin-top: 1px;
}
.cv-row + .cv-role {
  margin-top: 1px;
  margin-bottom: 1px;
}
.cv-right {
  flex-shrink: 0;
  text-align: right;
  white-space: nowrap;
  font-size: var(--cv-body-size);
  font-weight: 400;
  line-height: var(--cv-line);
}
.cv-sub {
  margin: 2px 0 3px;
  font-weight: 400;
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
}
.cv-bullets {
  list-style: none !important;
  margin: 2px 0 0;
  padding: 0;
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
}
.cv-bullets li {
  list-style: none !important;
  position: relative;
  padding-left: 12px;
  margin: 0 0 var(--cv-li-gap);
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
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
  margin: 3px 0;
  font-size: var(--cv-body-size);
  line-height: var(--cv-line);
  font-weight: 400;
}
.cv-skills-line strong,
.cv-skills-line b {
  font-weight: 700;
}
/* User / editor bold inside body copy */
.cv-sheet b,
.cv-sheet strong {
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
    padding: 10mm 12mm !important;
    transform: none !important;
  }
}
`;

export function buildEmptyCvHtml(): string {
  return `<div class="cv-sheet">
  <header class="cv-header">
    <p class="cv-name">WU XUELIAN, KACY</p>
    <p class="cv-contact">+852 65733452 | wuxuelian25@126.com | Hong Kong | IANG Visa</p>
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
          <div class="cv-left">Crossroads Foundation, Hong Kong <span class="cv-role-inline">| Engagement Department Intern</span></div>
          <div class="cv-right">Dec 2025 - Now</div>
        </div>
        <ul class="cv-bullets">
          <li>Conducted market research and data collection on ESG-focused companies in Mainland China, identifying potential partners, contact channels, and collaboration models to support targeted outreach and engagement strategies</li>
          <li>Mapped stakeholder pathways and drafted bilingual outreach briefs that accelerated partnership screening for climate- and sustainability-related programmes</li>
          <li>Worked proactively in an international NGO environment, enhancing learning agility, initiative, cultural sensitivity, and cross-cultural collaboration skills</li>
        </ul>
      </div>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Chongqing Urban Greening Management Center, Chongqing <span class="cv-role-inline">| Landscape Architect Intern</span></div>
          <div class="cv-right">Jan - April 2025</div>
        </div>
        <ul class="cv-bullets">
          <li>Conducted baseline site assessments and supported landscape planning for urban greening projects, integrating public consultation insights to identify environmental constraints and opportunities in line with sustainability and ESG principles</li>
          <li>Researched local policies and regulatory frameworks related to urban greening and sustainable development, contributing to discussions on green infrastructure strategies, climate resilience, and low-impact development (LID) approaches</li>
          <li>Assisted in preparing technical drawings and presentation materials that communicated greening proposals to municipal stakeholders and project teams</li>
        </ul>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">SCHOOL PROJECTS &amp; LEADERSHIP</h2>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Sustainable Architectural Design in Hong Kong <span class="cv-role-inline">| Independent Developer</span></div>
          <div class="cv-right">Sept 2025 - Dec 2025</div>
        </div>
        <ul class="cv-bullets">
          <li>Developed a climate-responsive building design and conducted a preliminary BEAM Plus NB v2.0 assessment, achieving a Gold rating outcome.</li>
        </ul>
      </div>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">SWU Science Fiction Society <span class="cv-role-inline">| President</span></div>
          <div class="cv-right">Sept 2022 - Jun 2023</div>
        </div>
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

/** Cap internship/work bullets at 4 per entry (AI should aim for 2–4, prefer 3) */
export function enforceInternshipBullets(html: string): string {
  return enforceBulletsInSection(html, /INTERNSHIP|WORK EXPERIENCE/i, 4);
}

/** @deprecated Use enforceInternshipBullets — kept as alias for compatibility */
export function enforceTwoInternshipBullets(html: string): string {
  return enforceInternshipBullets(html);
}

/** Projects / leadership: exactly 1 bullet per entry */
export function enforceOneProjectBullet(html: string): string {
  return enforceBulletsInSection(html, /PROJECTS|LEADERSHIP/i, 1);
}

/**
 * Merge separate <p class="cv-role"> into cv-left as "Company | Role"
 * for internship / project / leadership entries (education keeps cv-role).
 */
export function mergeCompanyRoleInline(html: string): string {
  return html.replace(
    /(<h2[^>]*>)([\s\S]*?)(<\/h2>)([\s\S]*?)(?=<h2\b|$)/gi,
    (full, open: string, titleInner: string, close: string, body: string) => {
      const titleText = titleInner.replace(/<[^>]+>/g, " ");
      if (!/INTERNSHIP|WORK EXPERIENCE|PROJECTS|LEADERSHIP/i.test(titleText)) {
        return full;
      }
      // Pattern: cv-row > cv-left + cv-right, then optional sibling <p class="cv-role">
      const merged = body.replace(
        /(<div class="cv-left">)([\s\S]*?)(<\/div>)(\s*<div class="cv-right">[\s\S]*?<\/div>\s*<\/div>\s*)(?:<p class="cv-role">([\s\S]*?)<\/p>\s*)?/gi,
        (
          _m,
          leftOpen: string,
          leftInner: string,
          leftClose: string,
          rest: string,
          role?: string
        ) => {
          const roleText = String(role || "")
            .replace(/<[^>]+>/g, "")
            .trim();
          let left = leftInner.trim();
          if (/cv-role-inline/i.test(left) || /\|\s*[^<]+/.test(left)) {
            return `${leftOpen}${leftInner}${leftClose}${rest}`;
          }
          if (!roleText) return `${leftOpen}${leftInner}${leftClose}${rest}`;
          left = `${left} <span class="cv-role-inline">| ${roleText}</span>`;
          return `${leftOpen}${left}${leftClose}${rest}`;
        }
      );
      return `${open}${titleInner}${close}${merged}`;
    }
  );
}

export type CvContactInfo = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  visa?: string;
};

/** Build compact contact line: phone | email | address | visa */
export function buildCvContactLine(info: CvContactInfo): string {
  return [
    info.phone?.trim(),
    info.email?.trim(),
    info.address?.trim(),
    info.visa?.trim(),
  ]
    .filter(Boolean)
    .join(" | ");
}

/**
 * Sync CV header name + contact line from Profile (Address / Visa included).
 * Safe to run on every generate / refine / export path.
 */
export function ensureCvHeaderContact(
  html: string,
  info: CvContactInfo
): string {
  if (!html) return html;
  let out = html;
  const name = (info.name || "").trim();
  const line = buildCvContactLine(info);
  if (name) {
    if (/<p[^>]*class="[^"]*cv-name[^"]*"[^>]*>[\s\S]*?<\/p>/i.test(out)) {
      out = out.replace(
        /<p([^>]*class="[^"]*cv-name[^"]*"[^>]*)>[\s\S]*?<\/p>/i,
        `<p$1>${escapeCvText(name)}</p>`
      );
    }
  }
  if (line) {
    if (/<p[^>]*class="[^"]*cv-contact[^"]*"[^>]*>[\s\S]*?<\/p>/i.test(out)) {
      out = out.replace(
        /<p([^>]*class="[^"]*cv-contact[^"]*"[^>]*)>[\s\S]*?<\/p>/i,
        `<p$1>${escapeCvText(line)}</p>`
      );
    } else if (/<p[^>]*class="[^"]*cv-name[^"]*"[^>]*>[\s\S]*?<\/p>/i.test(out)) {
      out = out.replace(
        /(<p[^>]*class="[^"]*cv-name[^"]*"[^>]*>[\s\S]*?<\/p>)/i,
        `$1\n    <p class="cv-contact">${escapeCvText(line)}</p>`
      );
    }
  }
  return out;
}

export const CV_HTML_SCHEMA_HINT = `Return HTML rooted in <div class="cv-sheet"> that FILLS exactly ONE A4 page (no overflow):

=== Structure ===
header.cv-header (p.cv-name + p.cv-contact) + div.cv-body with sections:
EDUCATION → INTERNSHIP EXPERIENCE → (SCHOOL PROJECTS & LEADERSHIP OR PROJECTS & OTHER EXPERIENCES) → SKILLS
Do NOT create a CERTIFICATES section heading.

=== Header / Contact (MANDATORY) ===
- p.cv-name = candidate full name from Contact section
- p.cv-contact = single compact line joined by " | " (NOT "Email:" label):
  Phone | Email | Address | Visa
  Example: +852 65733452 | wuxuelian25@126.com | Hong Kong | IANG Visa
- Use Address and Visa / Work Authorization exactly as provided in Contact / Profile Data when present.

=== Entry pattern ===
Wrap each item in <div class="cv-entry">:
1) Top row (flex space-between) — Company/Project and Role on THE SAME LINE:
   <div class="cv-row">
     <div class="cv-left">Company Name, City <span class="cv-role-inline">| Role Title</span></div>
     <div class="cv-right">DATE_RANGE</div>
   </div>
   Example: <div class="cv-left">Crossroads Foundation, Hong Kong <span class="cv-role-inline">| Engagement Department Intern</span></div>
2) Do NOT put role on a separate <p class="cv-role"> for internship / projects / leadership (education may still use <p class="cv-role"> for degree).
3) Then bullets:
   <ul class="cv-bullets"><li>…</li></ul>

=== INTERNSHIP / WORK BULLETS (STAR-style, MANDATORY) ===
- Header line MUST be: "Company/Organization Name, City | Role" (role in cv-role-inline span)
- cv-right = dates
- Rewrite from Step 1–2 mapping: collectively cover ALL extracted JD core requirements across entries.
- EACH internship/work entry: 2–4 STAR bullets (RECOMMENDED: 3). Scale by source richness + JD match.
- Each bullet: strong Action Verb first + Task/Context + Tools/Methods + Quantifiable Impact (keep library metrics).
- Career tone: applied ESG / sustainability analysis & practical implementation — NOT drafting regulations or setting rules.
- Fluency: idiomatic HK Business English. Never invent employers, dates, or metrics.

=== PROJECTS / LEADERSHIP (critical) ===
- Section title: "SCHOOL PROJECTS & LEADERSHIP" OR "PROJECTS & OTHER EXPERIENCES"
- Header: "Project/Org Name <span class=\"cv-role-inline\">| Identity</span>" + dates on cv-right
- EACH entry: EXACTLY 1 bullet — strongest JD-aligned outcome
- For "Sustainable Architectural Design in Hong Kong", dates e.g. "Sept 2025 - Dec 2025"

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
- Default ~10.5pt body with compact line-height (~1.28); sections CSS-distributed evenly. Prefer 3 internship bullets; stay on one page.

=== Rules ===
- Classes ONLY: cv-section, cv-section-title, cv-entry, cv-row, cv-left, cv-role, cv-right, cv-bullets, cv-skills-line, cv-sub
- NEVER put • / ● / - inside <li>
- Output English only in HTML. Never invent facts. No <style>/markdown.`;
