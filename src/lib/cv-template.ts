/**
 * A4 single-page CV — tight typography to stay on one page
 * Internship: "Company, City" | date → role → exactly 2 bullets
 * Projects: org/project | date → role → bullets
 */

export const CV_SHEET_CSS = `
.cv-a4-frame {
  width: 210mm;
  height: 297mm;
  background: #fff;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  flex-shrink: 0;
}
.cv-sheet {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5px;
  line-height: 1.32;
  color: #000;
  background: #fff;
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  margin: 0 auto;
  padding: 9mm 10mm;
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
  font-size: 22px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0;
  line-height: 1.1;
}
.cv-contact {
  font-size: 10.5px;
  margin-top: 5px;
  line-height: 1.3;
  font-weight: 400;
}
.cv-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 0;
  overflow: hidden;
}
.cv-section {
  margin: 0 0 10px;
  flex: 0 1 auto;
}
.cv-body > .cv-section:last-child {
  margin-bottom: 0;
}
.cv-section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1.5px solid #000;
  margin: 0 0 6px;
  padding: 0 0 2px;
  line-height: 1.25;
}
.cv-entry {
  margin: 0 0 8px;
}
.cv-entry:last-child {
  margin-bottom: 0;
}
.cv-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  width: 100%;
}
.cv-section > .cv-row + .cv-row,
.cv-section > .cv-bullets + .cv-row,
.cv-section > .cv-sub + .cv-row,
.cv-section > .cv-role + .cv-row {
  margin-top: 8px;
}
.cv-left {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #000;
  line-height: 1.28;
}
.cv-role {
  display: block;
  font-size: 10.5px;
  font-weight: 500;
  font-style: italic;
  margin: 1px 0 0;
  line-height: 1.3;
  color: #000;
}
.cv-left .cv-role {
  margin-top: 2px;
}
.cv-row + .cv-role {
  margin-top: 1px;
  margin-bottom: 1px;
}
.cv-right {
  flex-shrink: 0;
  text-align: right;
  white-space: nowrap;
  font-size: 10.5px;
  font-weight: 400;
  line-height: 1.28;
}
.cv-sub {
  margin: 2px 0 3px;
  font-weight: 400;
  font-size: 10px;
  line-height: 1.3;
}
.cv-bullets {
  list-style: none !important;
  margin: 3px 0 0;
  padding: 0;
  font-size: 10.5px;
  line-height: 1.32;
}
.cv-bullets li {
  list-style: none !important;
  position: relative;
  padding-left: 12px;
  margin: 0 0 3px;
  font-size: 10.5px;
  line-height: 1.32;
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
  font-size: 10.5px;
  line-height: 1.32;
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
    max-height: 297mm !important;
    overflow: hidden !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
  }
  .cv-sheet {
    padding: 9mm 10mm !important;
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
          <li>Conducted market research and data collection on ESG-focused companies in Mainland China, identifying potential partners and collaboration models to support targeted outreach</li>
          <li>Worked proactively in an international NGO environment, strengthening cross-cultural collaboration, initiative, and learning agility</li>
        </ul>
      </div>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Chongqing Urban Greening Management Center, Chongqing</div>
          <div class="cv-right">Jan - April 2025</div>
        </div>
        <p class="cv-role">Landscape Architect Intern</p>
        <ul class="cv-bullets">
          <li>Conducted baseline site assessments and supported landscape planning for urban greening projects, aligning with sustainability and ESG principles</li>
          <li>Researched local greening policies and contributed to green infrastructure, climate resilience, and low-impact development (LID) discussions</li>
        </ul>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">SCHOOL PROJECTS &amp; LEADERSHIP</h2>
      <div class="cv-entry">
        <div class="cv-row">
          <div class="cv-left">Sustainable Architectural Design in Hong Kong</div>
          <div class="cv-right"></div>
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
          <li>Oversaw overall operations and coordinated planning, publicity, and finance across departments.</li>
          <li>Managed content planning, design, and publishing on social media platforms such as Xiaohongshu.</li>
        </ul>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">SKILLS</h2>
      <p class="cv-skills-line"><strong>Software:</strong> Microsoft Office, Arcgis, Google Earth Engine, Photoshop, Adobe Illustrator, InDesign, Adobe Premiere Pro, ENVI-met, 3D Modeling Software</p>
      <p class="cv-skills-line"><strong>Language:</strong> IELTS 7.0; CANTONESE (advanced); MANDARIN (native speaker)</p>
      <p class="cv-skills-line"><strong>BEAM Affiliate</strong>; <strong>CFA - ESG</strong></p>
    </section>
  </div>
</div>`;
}

export function buildFallbackCvHtml(): string {
  return buildEmptyCvHtml();
}

/** Keep at most 2 <li> per internship/work entry's bullet list */
export function enforceTwoInternshipBullets(html: string): string {
  return html.replace(
    /(<h2[^>]*>\s*INTERNSHIP[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2\b|$)/i,
    (_full, title: string, body: string) => {
      const trimmed = body.replace(
        /(<ul[^>]*class="[^"]*cv-bullets[^"]*"[^>]*>)([\s\S]*?)(<\/ul>)/gi,
        (_u, open: string, inner: string, close: string) => {
          const items = [...inner.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)].map(
            (m) => m[0]
          );
          return `${open}${items.slice(0, 2).join("")}${close}`;
        }
      );
      return `${title}${trimmed}`;
    }
  );
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

=== INTERNSHIP / WORK EXPERIENCE (critical) ===
- cv-left MUST be exactly: "Company/Organization Name, City"
- cv-right = dates; cv-role = job title only
- STRICT: EACH internship/work entry MUST have EXACTLY 2 bullet points (never 1, never 3+).
- Those 2 bullets must be highly distilled, merge the strongest facts, and maximise JD keyword match.

=== PROJECTS section title ===
Use ONE of: "SCHOOL PROJECTS & LEADERSHIP" OR "PROJECTS & OTHER EXPERIENCES"

=== Projects / leadership items ===
- cv-left = name; cv-right = dates; cv-role = identity; then bullets (prefer ≤2)

=== Education ===
- cv-left = school; cv-right = dates
- For HKU MSc: put GPA INLINE on the same line as the degree, e.g.
  <p class="cv-role">MSc in Sustainable Environmental Design | GPA: 3.8/4.0</p>
  Do NOT put GPA on a separate line.
- Then <p class="cv-sub">Major courses: …</p> from the COURSE POOL

=== SKILLS / Certificates ===
- SKILLS section only: Software + Language lines, then certificate names as bold text on their own cv-skills-line, e.g.
  <p class="cv-skills-line"><strong>BEAM Affiliate</strong>; <strong>CFA - ESG</strong></p>
- NEVER use <h2>CERTIFICATES</h2>

=== Single-page A4 ===
- Keep copy concise so everything fits one A4 with the provided CSS (tight leading). Prefer shorter bullets over overflow.

=== Rules ===
- Classes ONLY: cv-section, cv-section-title, cv-entry, cv-row, cv-left, cv-role, cv-right, cv-bullets, cv-skills-line, cv-sub
- NEVER put • / ● / - inside <li>
- English only. Never invent facts. No <style>/markdown.`;
