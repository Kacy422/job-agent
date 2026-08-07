/**
 * A4 single-page CV — expanded hierarchy
 * Internship: "Company, City" | date → role → bullets
 * Projects: org/project | date → role → bullets
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
}
.cv-sheet {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #000;
  background: #fff;
  width: 210mm;
  height: 297mm;
  max-width: 100%;
  margin: 0 auto;
  padding: 11mm 12mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.cv-sheet * { box-sizing: border-box; }
.cv-header {
  text-align: center;
  margin: 0 0 16px;
  flex-shrink: 0;
}
.cv-name {
  font-size: 28px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  margin: 0;
  line-height: 1.12;
}
.cv-contact {
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.45;
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
  margin: 0 0 24px;
  flex: 0 1 auto;
}
.cv-body > .cv-section:last-child {
  margin-bottom: 0;
}
.cv-section-title {
  font-size: 16px;
  font-weight: 700;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  border-bottom: 2px solid #000;
  margin: 0 0 12px;
  padding: 0 0 3px;
  line-height: 1.3;
}
.cv-entry {
  margin: 0 0 14px;
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
  margin-top: 14px;
}
.cv-left {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: #000;
  line-height: 1.35;
}
/* 职位 / 学位：紧跟顶行下方（可放在 cv-row 外，或 cv-left 内） */
.cv-role {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  font-style: italic;
  margin: 2px 0 0;
  line-height: 1.4;
  color: #000;
}
.cv-left .cv-role {
  margin-top: 3px;
}
.cv-row + .cv-role {
  margin-top: 2px;
  margin-bottom: 2px;
}
.cv-right {
  flex-shrink: 0;
  text-align: right;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.35;
}
.cv-sub {
  margin: 4px 0 6px;
  font-weight: 400;
  font-size: 12px;
  line-height: 1.5;
}
.cv-bullets {
  list-style: none !important;
  margin: 6px 0 0;
  padding: 0;
  font-size: 12px;
  line-height: 1.5;
}
.cv-bullets li {
  list-style: none !important;
  position: relative;
  padding-left: 14px;
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.5;
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
  margin: 6px 0;
  font-size: 12px;
  line-height: 1.5;
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
  }
  .cv-sheet {
    padding: 11mm 12mm !important;
    page-break-after: avoid;
    page-break-inside: avoid;
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
        <p class="cv-role">MSc in Sustainable Environmental Design</p>
        <p class="cv-sub">GPA: 3.8 / 4.0</p>
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
          <li>Assisted in preparation of project cost estimates and financial analyses, supporting resource allocation decisions with consideration of economic sustainability and lifecycle thinking</li>
          <li>Researched local policies and regulatory frameworks related to urban greening and sustainable development, contributing to discussions on green infrastructure strategies, climate resilience, and low-impact development (LID) approaches</li>
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
          <li>Oversaw overall operations, coordinated work across departments (planning, publicity, finance).</li>
          <li>Managed content planning, designing, and publishing on social media like xiaohongshu.</li>
        </ul>
      </div>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">SKILLS</h2>
      <p class="cv-skills-line"><strong>Software:</strong> Microsoft Office, Arcgis, Google Earth Engine, Photoshop, Adobe Illustrator, InDesign, Adobe Premiere Pro, ENVI-met, 3D Modeling Software</p>
      <p class="cv-skills-line"><strong>Language:</strong> IELTS 7.0; CANTONESE (advanced); MANDARIN (native speaker)</p>
    </section>
    <section class="cv-section">
      <h2 class="cv-section-title">CERTIFICATES</h2>
      <p class="cv-skills-line">BEAM Affiliate, CFA - ESG</p>
    </section>
  </div>
</div>`;
}

export function buildFallbackCvHtml(): string {
  return buildEmptyCvHtml();
}

export const CV_HTML_SCHEMA_HINT = `Return HTML rooted in <div class="cv-sheet"> that FILLS one A4 page:

=== Structure ===
header.cv-header (p.cv-name + p.cv-contact) + div.cv-body with sections:
EDUCATION → INTERNSHIP EXPERIENCE → (SCHOOL PROJECTS & LEADERSHIP OR PROJECTS & OTHER EXPERIENCES) → SKILLS → CERTIFICATES

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

=== INTERNSHIP EXPERIENCE (critical) ===
- cv-left MUST be exactly: "Company/Organization Name, City"
  e.g. "Crossroads Foundation, Hong Kong"
  e.g. "Chongqing Urban Greening Management Center, Chongqing"
- cv-right = dates (e.g. "Dec 2025 - Now")
- cv-role = job title only (e.g. "Engagement Department Intern") — never put city in cv-role

=== PROJECTS section title ===
Use ONE of:
- "SCHOOL PROJECTS & LEADERSHIP"
- "PROJECTS & OTHER EXPERIENCES"
Pick whichever fits the content better.

=== Projects / leadership items ===
- cv-left = organization or project name ONLY (e.g. "SWU Science Fiction Society")
- cv-right = date range ONLY (e.g. "Sept 2022 - Jun 2023") — do NOT put city in the date field
- cv-role = identity (e.g. "President", "Independent Developer")
- then bullets for outcomes

=== Education ===
- cv-left = school name; cv-right = dates; cv-role = degree
- For HKU MSc: include <p class="cv-sub">GPA: X.X / Y.Y</p> using the GPA from the experience library (do not invent)
- Then <p class="cv-sub">Major courses: …</p> selected from the COURSE POOL (see system prompt)

=== SKILLS vs CERTIFICATES ===
- SKILLS section: Software + Language lines only (cv-skills-line)
- CERTIFICATES section: separate <h2 class="cv-section-title">CERTIFICATES</h2> (font-bold via class) with certificate list as cv-skills-line
- Do NOT nest certificates under SKILLS as "Certificate:"

=== Rules ===
- Classes ONLY: cv-section, cv-section-title, cv-entry, cv-row, cv-left, cv-role, cv-right, cv-bullets, cv-skills-line, cv-sub
- NEVER put • / ● / - inside <li>
- English only. Never invent facts. No <style>/markdown.`;
