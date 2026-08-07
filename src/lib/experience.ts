import type { ProfileData, ProfileEntry } from "@/types";
import { DEFAULT_PROFILE_FROM_CV, EMPTY_PROFILE } from "@/types";

function formatEntries(title: string, entries: ProfileEntry[]): string {
  if (!entries.length) return "";
  const blocks = entries.map((e) => {
    const detailLines = (e.detail || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const [roleOrDegree, ...restDetail] = detailLines;
    const lines = [
      `Organization/School/Project (bold on left): ${e.headline}`,
      e.period ? `Dates (right-aligned only, no city here): ${e.period}` : "",
      roleOrDegree
        ? `Role/Degree/Identity (next line under header, italic): ${roleOrDegree}`
        : "",
      ...restDetail,
      ...e.bullets.filter(Boolean).map((b) => `- ${b}`),
    ].filter(Boolean);
    return lines.join("\n");
  });
  return `## ${title}\n${blocks.join("\n\n")}`;
}

export function buildFullExperienceFromProfile(profile: ProfileData): string {
  const parts: string[] = [];
  const contact = [
    profile.contactName,
    profile.contactPhone,
    profile.contactEmail,
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  if (contact.length) {
    parts.push(`# Contact\n${contact.join(" · ")}`);
  }
  const edu = formatEntries("Education", profile.education);
  const intern = formatEntries("Internship Experience", profile.internship);
  const proj = formatEntries(
    "School Projects & Leadership / Projects & Other Experiences",
    profile.projects
  );
  if (edu) parts.push(edu);
  if (intern) parts.push(intern);
  if (proj) parts.push(proj);

  const skills: string[] = [];
  if (profile.skillsSoftware.trim())
    skills.push(`Software: ${profile.skillsSoftware.trim()}`);
  if (profile.skillsLanguage.trim())
    skills.push(`Language: ${profile.skillsLanguage.trim()}`);
  if (profile.skillsCertificate.trim())
    skills.push(`Certificate: ${profile.skillsCertificate.trim()}`);
  if (skills.length) parts.push(`## Skills & Certificates\n${skills.join("\n")}`);

  if (profile.quickNotes.trim()) {
    parts.push(`## Quick Notes\n${profile.quickNotes.trim()}`);
  }
  return parts.join("\n\n").trim();
}

/** 兼容旧字符串画像 → 结构化；否则使用 PDF 预填默认画像 */
export function migrateToProfile(
  masterCv?: string,
  extraNotes?: string,
  existing?: unknown
): ProfileData {
  if (existing && typeof existing === "object" && existing !== null) {
    const e = existing as Partial<ProfileData>;
    // 新结构
    if (Array.isArray(e.education) || Array.isArray(e.internship)) {
      const pick = (v: string | undefined, fallback: string) =>
        (v ?? "").trim() || fallback;
      return {
        ...DEFAULT_PROFILE_FROM_CV,
        ...e,
        education: e.education?.length
          ? e.education
          : DEFAULT_PROFILE_FROM_CV.education,
        internship: e.internship?.length
          ? e.internship
          : DEFAULT_PROFILE_FROM_CV.internship,
        projects: e.projects?.length
          ? e.projects
          : DEFAULT_PROFILE_FROM_CV.projects,
        contactName: pick(e.contactName, DEFAULT_PROFILE_FROM_CV.contactName),
        contactPhone: pick(
          e.contactPhone,
          DEFAULT_PROFILE_FROM_CV.contactPhone
        ),
        contactEmail: pick(
          e.contactEmail,
          DEFAULT_PROFILE_FROM_CV.contactEmail
        ),
        phoneCountryCode: pick(
          e.phoneCountryCode,
          DEFAULT_PROFILE_FROM_CV.phoneCountryCode
        ),
        phoneNumber: pick(
          e.phoneNumber,
          DEFAULT_PROFILE_FROM_CV.phoneNumber
        ),
        title: pick(e.title, DEFAULT_PROFILE_FROM_CV.title),
        surname: pick(e.surname, DEFAULT_PROFILE_FROM_CV.surname),
        givenName: pick(e.givenName, DEFAULT_PROFILE_FROM_CV.givenName),
        preferredName: pick(
          e.preferredName,
          DEFAULT_PROFILE_FROM_CV.preferredName
        ),
        hkid: e.hkid ?? "",
        passport: e.passport ?? "",
        workVisaStatus: pick(
          e.workVisaStatus,
          DEFAULT_PROFILE_FROM_CV.workVisaStatus
        ),
        availableDate: e.availableDate ?? "",
        expectedSalary: e.expectedSalary ?? "",
        educationLevel: pick(
          e.educationLevel,
          DEFAULT_PROFILE_FROM_CV.educationLevel
        ),
        gpaScore: pick(e.gpaScore, DEFAULT_PROFILE_FROM_CV.gpaScore),
        gpaScale: pick(e.gpaScale, DEFAULT_PROFILE_FROM_CV.gpaScale),
        gpaPercentage: pick(
          e.gpaPercentage,
          DEFAULT_PROFILE_FROM_CV.gpaPercentage
        ),
        applyExtras:
          e.applyExtras && typeof e.applyExtras === "object"
            ? e.applyExtras
            : {},
        skillsSoftware: pick(
          e.skillsSoftware,
          DEFAULT_PROFILE_FROM_CV.skillsSoftware
        ),
        skillsLanguage: pick(
          e.skillsLanguage,
          DEFAULT_PROFILE_FROM_CV.skillsLanguage
        ),
        skillsCertificate: pick(
          e.skillsCertificate,
          DEFAULT_PROFILE_FROM_CV.skillsCertificate
        ),
        quickNotes: e.quickNotes ?? "",
      };
    }
    // 旧结构 contact/education 字符串
    const legacy = existing as Record<string, string>;
    if (legacy.education || legacy.internship || legacy.contact) {
      return {
        ...DEFAULT_PROFILE_FROM_CV,
        quickNotes: legacy.quickNotes || extraNotes || "",
      };
    }
  }
  if (masterCv?.trim()) {
    return {
      ...DEFAULT_PROFILE_FROM_CV,
      quickNotes: (extraNotes || "").trim(),
    };
  }
  // 首次启动：直接用 PDF 解析预填
  return structuredClone(DEFAULT_PROFILE_FROM_CV);
}

export function buildFullExperience(masterCv: string, extraNotes: string): string {
  const master = masterCv.trim();
  const notes = extraNotes.trim();
  if (!master && !notes) return "";
  if (!notes) return master;
  if (!master) return notes;
  return `${master}\n\n## Quick Notes\n${notes}`;
}

export { EMPTY_PROFILE };
