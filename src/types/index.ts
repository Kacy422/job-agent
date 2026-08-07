/** 求职进度 · 网申状态 */
export type TrackStatus =
  | "preparing"
  | "applying"
  | "applied"
  | "interview";

export const TRACK_LABEL: Record<TrackStatus, string> = {
  preparing: "准备中",
  applying: "网申中",
  applied: "网申完成",
  interview: "收到面试",
};

export interface InterviewQA {
  question: string;
  answer: string;
  tip?: string;
}

/** CV 改写说明 · 增加 / 减少（含原因） */
export interface CvRationaleItem {
  text: string;
  reason: string;
}

export interface CvRationale {
  added: CvRationaleItem[];
  removed: CvRationaleItem[];
}

export const EMPTY_CV_RATIONALE: CvRationale = {
  added: [],
  removed: [],
};

export function isCvRationaleEmpty(r?: CvRationale | null): boolean {
  if (!r) return true;
  return r.added.length + r.removed.length === 0;
}

function coerceItem(raw: unknown): CvRationaleItem | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    const m = s.match(/^(.*?)(?:\s*[（(]原因[:：]\s*(.+?)[）)])\s*$/);
    if (m) return { text: m[1].trim(), reason: m[2].trim() };
    return { text: s, reason: "" };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const text = String(o.text || o.content || o.item || "").trim();
    const reason = String(o.reason || o.why || "").trim();
    if (!text && !reason) return null;
    return { text: text || reason, reason: text ? reason : "" };
  }
  return null;
}

/** 兼容旧版 string[] / 含 why 字段的三段式 */
export function normalizeCvRationale(raw: unknown): CvRationale {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const added = (Array.isArray(o.added) ? o.added : [])
      .map(coerceItem)
      .filter(Boolean) as CvRationaleItem[];
    const removed = (Array.isArray(o.removed) ? o.removed : [])
      .map(coerceItem)
      .filter(Boolean) as CvRationaleItem[];
    // 旧版 why → 并入第一条增加项的原因（若有）
    if (Array.isArray(o.why) && o.why.length && added.length) {
      const whyText = o.why.map(String).filter(Boolean).join("；");
      if (whyText && !added[0].reason) added[0] = { ...added[0], reason: whyText };
    }
    return { added, removed };
  }
  if (Array.isArray(raw)) {
    const lines = raw.map(coerceItem).filter(Boolean) as CvRationaleItem[];
    return {
      added: lines.slice(0, Math.ceil(lines.length / 2)),
      removed: lines.slice(Math.ceil(lines.length / 2)),
    };
  }
  return { ...EMPTY_CV_RATIONALE, added: [], removed: [] };
}

export function formatRationaleLine(item: CvRationaleItem): string {
  if (item.reason) return `${item.text}（原因：${item.reason}）`;
  return item.text;
}

export interface JobApplication {
  id: string;
  company: string;
  title: string;
  /** Full JD text (jd_text) */
  jd: string;
  /** Explicit alias of jd for tracker / export clarity */
  jdText?: string;
  /** Job posting URL (job_url) */
  applyUrl?: string;
  /** Explicit alias of applyUrl */
  jobUrl?: string;
  cvHtml?: string;
  coverLetter?: string;
  rationale?: CvRationale;
  /** @deprecated 使用 rationale */
  rationaleList?: string[];
  interviewQA?: InterviewQA[];
  trackStatus: TrackStatus;
  createdAt: string;
  updatedAt: string;
}

/** Resolve full JD text from an application record */
export function appJdText(app: Pick<JobApplication, "jd" | "jdText">): string {
  return String(app.jdText || app.jd || "").trim();
}

/** Resolve job URL from an application record */
export function appJobUrl(
  app: Pick<JobApplication, "applyUrl" | "jobUrl">
): string {
  return String(app.jobUrl || app.applyUrl || "").trim();
}

/** 画像条目（教育/实习/项目） */
export interface ProfileEntry {
  id: string;
  headline: string;
  detail?: string;
  period?: string;
  bullets: string[];
}

export interface ProfileData {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  /** Structured phone for split country-code / local forms */
  phoneCountryCode: string;
  phoneNumber: string;
  /** HK / global apply form fields */
  title: string;
  surname: string;
  givenName: string;
  preferredName: string;
  hkid: string;
  passport: string;
  workVisaStatus: string;
  availableDate: string;
  expectedSalary: string;
  educationLevel: string;
  gpaScore: string;
  gpaScale: string;
  gpaPercentage: string;
  /** Extra answers keyed by field label (from supplement modal) */
  applyExtras: Record<string, string>;
  education: ProfileEntry[];
  internship: ProfileEntry[];
  projects: ProfileEntry[];
  skillsSoftware: string;
  skillsLanguage: string;
  skillsCertificate: string;
  quickNotes: string;
}

export type ProfileScalarKey =
  | "contactName"
  | "contactPhone"
  | "contactEmail"
  | "phoneCountryCode"
  | "phoneNumber"
  | "title"
  | "surname"
  | "givenName"
  | "preferredName"
  | "hkid"
  | "passport"
  | "workVisaStatus"
  | "availableDate"
  | "expectedSalary"
  | "educationLevel"
  | "gpaScore"
  | "gpaScale"
  | "gpaPercentage"
  | "skillsSoftware"
  | "skillsLanguage"
  | "skillsCertificate"
  | "quickNotes";

function eid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 从 cvenvironment.pdf 预填的默认人物画像 */
export const DEFAULT_PROFILE_FROM_CV: ProfileData = {
  contactName: "WU XUELIAN, KACY",
  contactPhone: "+852 65733452",
  contactEmail: "wuxuelian25@126.com",
  phoneCountryCode: "+852",
  phoneNumber: "65733452",
  title: "Ms.",
  surname: "Wu",
  givenName: "Xuelian",
  preferredName: "Kacy",
  hkid: "",
  passport: "",
  workVisaStatus: "IANG",
  availableDate: "",
  expectedSalary: "",
  educationLevel: "Master's Degree",
  gpaScore: "3.8",
  gpaScale: "4.0",
  gpaPercentage: "88%",
  applyExtras: {},
  education: [
    {
      id: eid("edu"),
      headline: "The University of Hong Kong",
      detail:
        "MSc in Sustainable Environmental Design | GPA: 3.8/4.0\nMajor courses: Green Building Assessment and Climate Responsive Design, Environmental Policy and Management of Megacities, Bioclimatic Architectural Design",
      period: "Sept 2025 - Nov 2026",
      bullets: [],
    },
    {
      id: eid("edu"),
      headline: "Southwest University",
      detail: "B.Eng. in Landscape Architecture",
      period: "Sept 2021 - June 2025",
      bullets: [],
    },
  ],
  internship: [
    {
      id: eid("int"),
      headline: "Crossroads Foundation, Hong Kong",
      detail: "Engagement Department Intern",
      period: "Dec 2025 - Now",
      bullets: [
        "Conducted market research and data collection on ESG-focused companies in Mainland China, identifying potential partners, contact channels, and collaboration models to support targeted outreach and engagement strategies",
        "Worked proactively in an international NGO environment, enhancing learning agility, initiative, cultural sensitivity, and cross-cultural collaboration skills",
      ],
    },
    {
      id: eid("int"),
      headline: "Chongqing Urban Greening Management Center, Chongqing",
      detail: "Landscape Architect Intern",
      period: "Jan - April 2025",
      bullets: [
        "Conducted baseline site assessments and supported landscape planning for urban greening projects, integrating public consultation insights in line with sustainability and ESG principles",
        "Researched local policies on urban greening and sustainable development, contributing to green infrastructure, climate resilience, and low-impact development (LID) approaches",
      ],
    },
  ],
  projects: [
    {
      id: eid("prj"),
      headline: "Sustainable Architectural Design in Hong Kong",
      detail: "Independent Developer",
      period: "Sept 2025 - Dec 2025",
      bullets: [
        "Developed a climate-responsive building design and conducted a preliminary BEAM Plus NB v2.0 assessment, achieving a Gold rating outcome.",
      ],
    },
    {
      id: eid("prj"),
      headline: "SWU Science Fiction Society",
      detail: "President",
      period: "Sept 2022 - Jun 2023",
      bullets: [
        "Led society operations across planning, publicity and finance, and drove content design and publishing on Xiaohongshu to grow engagement.",
      ],
    },
  ],
  skillsSoftware:
    "Microsoft Office, ArcGIS, Google Earth Engine, Photoshop, Adobe Illustrator, InDesign, Adobe Premiere Pro, ENVI-met, 3D Modeling Software",
  skillsLanguage: "IELTS 7.0; CANTONESE (advanced); MANDARIN (native speaker)",
  skillsCertificate: "BEAM Affiliate; CFA - ESG",
  quickNotes: "",
};

export const EMPTY_PROFILE: ProfileData = {
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  phoneCountryCode: "",
  phoneNumber: "",
  title: "",
  surname: "",
  givenName: "",
  preferredName: "",
  hkid: "",
  passport: "",
  workVisaStatus: "",
  availableDate: "",
  expectedSalary: "",
  educationLevel: "",
  gpaScore: "",
  gpaScale: "",
  gpaPercentage: "",
  applyExtras: {},
  education: [],
  internship: [],
  projects: [],
  skillsSoftware: "",
  skillsLanguage: "",
  skillsCertificate: "",
  quickNotes: "",
};

/** @deprecated 旧看板 */
export type PipelineStatus =
  | "added"
  | "scraped"
  | "matched"
  | "resume_ready"
  | "apply_ready"
  | "filling"
  | "filled"
  | "submitted"
  | "interview"
  | "offer"
  | "rejected";

export type JobStatus =
  | "wishlist"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface Job {
  id: string;
  url: string;
  applyUrl?: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  source: string;
  tags: string[];
  description: string;
  keywords?: string[];
  matchScore?: number;
  matchGaps?: string[];
  matchStrengths?: string[];
  matchSummary?: string;
  pipelineStatus: PipelineStatus;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
  tailoredResume?: string;
  applyPack?: ApplyPack;
}

export interface ScoreResult {
  score: number;
  strengths: string[];
  gaps: string[];
  summary: string;
  keywords?: string[];
}

export interface ApplyPack {
  coverLetter: string;
  whyCompany: string;
  whyRole: string;
  strengthsAnswer: string;
  openQuestions: { question: string; answer: string }[];
  formFields: { label: string; value: string }[];
}

export interface ParsedJobPage {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  keywords: string[];
  applyUrl?: string;
}

export type AgentPhase =
  | "idle"
  | "opening"
  | "awaiting_login"
  | "awaiting_profile"
  | "filling"
  | "filled"
  | "error"
  | "stopped";

export interface AgentSession {
  sessionId: string;
  jobId: string;
  phase: AgentPhase;
  message: string;
  filledFields?: string[];
  error?: string;
}

export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  added: "已添加",
  scraped: "已抓取",
  matched: "已匹配",
  resume_ready: "简历已生成",
  apply_ready: "文案已生成",
  filling: "网申填表中",
  filled: "填表完成",
  submitted: "已投递",
  interview: "面试中",
  offer: "Offer",
  rejected: "未通过",
};

export function pipelineToLegacyStatus(p: PipelineStatus): JobStatus {
  switch (p) {
    case "submitted":
    case "filled":
    case "filling":
    case "apply_ready":
      return "applied";
    case "interview":
      return "interview";
    case "offer":
      return "offer";
    case "rejected":
      return "rejected";
    default:
      return "wishlist";
  }
}

export function pipelineToTrackStatus(p: PipelineStatus): TrackStatus {
  switch (p) {
    case "filling":
      return "applying";
    case "filled":
    case "submitted":
    case "apply_ready":
      return "applied";
    case "interview":
    case "offer":
      return "interview";
    default:
      return "preparing";
  }
}

export function newProfileEntry(
  partial?: Partial<ProfileEntry>
): ProfileEntry {
  return {
    id: eid("e"),
    headline: "",
    detail: "",
    period: "",
    bullets: [""],
    ...partial,
  };
}
