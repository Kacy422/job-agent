/**
 * Candidate course pool — AI selects JD-relevant Major courses from this list only.
 */
export const COURSE_POOL = [
  "Green Building Assessment",
  "Climate Responsive Design",
  "Green Building Assessment and Climate Responsive Design",
  "Microclimate Analysis",
  "Environmental Policy",
  "Environmental Policy and Management of Megacities",
  "Bioclimatic Architectural Design",
  "GIS",
  "Geographic Information Systems (GIS)",
  "Urban Greening and Landscape Planning",
  "Sustainable Environmental Design Studio",
  "Building Environmental Performance",
  "Climate Resilience and Adaptation",
] as const;

export function coursePoolPromptBlock(): string {
  return `=== COURSE POOL (Major courses — select ONLY from this list) ===
${COURSE_POOL.map((c, i) => `${i + 1}. ${c}`).join("\n")}

For the HKU MSc education entry, write Major courses by picking 3–5 items from the COURSE POOL that best match Target JD keywords (e.g. GIS / green building / climate / policy / microclimate).
- Do NOT invent course names outside this pool.
- Prefer the most JD-relevant titles; order by relevance.
- Format: <p class="cv-sub">Major courses: Course A, Course B, Course C</p>`;
}
