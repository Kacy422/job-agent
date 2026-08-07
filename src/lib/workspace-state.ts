import {
  DEFAULT_PROFILE_FROM_CV,
  EMPTY_CV_RATIONALE,
  normalizeCvRationale,
  type ApplyPack,
  type CvRationale,
  type Job,
  type JobApplication,
  type ProfileData,
} from "@/types";
import { migrateToProfile } from "@/lib/experience";

/** Serializable blob stored in Redis + localStorage cache */
export interface WorkspaceSnapshot {
  version: number;
  updatedAt: string;
  profile: ProfileData;
  applications: JobApplication[];
  selectedAppId: string | null;
  draftJd: string;
  draftJobUrl: string;
  draftCompany: string;
  draftTitle: string;
  tailoredResume: string;
  generationSourceKey: string | null;
  rationale: CvRationale;
  coverLetter: string;
  interviewQA: JobApplication["interviewQA"];
  applyPack: ApplyPack | null;
}

export const WORKSPACE_VERSION = 5;
export const LOCAL_CACHE_KEY = "job-agent-state-v5";

export function emptyWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    version: WORKSPACE_VERSION,
    updatedAt: new Date().toISOString(),
    profile: structuredClone(DEFAULT_PROFILE_FROM_CV),
    applications: [],
    selectedAppId: null,
    draftJd: "",
    draftJobUrl: "",
    draftCompany: "",
    draftTitle: "",
    tailoredResume: "",
    generationSourceKey: null,
    rationale: { ...EMPTY_CV_RATIONALE },
    coverLetter: "",
    interviewQA: [],
    applyPack: null,
  };
}

function jobToApplication(j: Job): JobApplication {
  return {
    id: j.id,
    company: j.company || "",
    title: j.title || "",
    jd: j.description || "",
    applyUrl: j.applyUrl || j.url || "",
    cvHtml: j.tailoredResume?.includes("cv-sheet")
      ? j.tailoredResume
      : undefined,
    coverLetter: j.applyPack?.coverLetter,
    trackStatus: "preparing",
    createdAt: j.createdAt,
    updatedAt: j.updatedAt || j.createdAt,
  };
}

/** Normalize any legacy / partial JSON into a WorkspaceSnapshot */
export function normalizeWorkspaceSnapshot(raw: unknown): WorkspaceSnapshot {
  const base = emptyWorkspaceSnapshot();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Record<string, unknown>;

  base.profile = migrateToProfile(
    String(parsed.masterCv || ""),
    String(parsed.extraNotes || ""),
    parsed.profile
  );

  if (Array.isArray(parsed.applications)) {
    base.applications = (parsed.applications as JobApplication[]).map(
      (a) => ({
        ...a,
        jd: String(a.jdText || a.jd || ""),
        jdText: String(a.jdText || a.jd || ""),
        applyUrl: String(a.jobUrl || a.applyUrl || "") || undefined,
        jobUrl: String(a.jobUrl || a.applyUrl || "") || undefined,
      })
    );
  } else if (Array.isArray(parsed.jobs)) {
    base.applications = (parsed.jobs as Job[]).map((j) =>
      jobToApplication({
        ...j,
        pipelineStatus: j.pipelineStatus || "matched",
        status: j.status || "wishlist",
        url: j.url || "",
        location: j.location || "",
        salary: j.salary || "",
        source: j.source || "",
        tags: j.tags || [],
      })
    );
  }

  if (typeof parsed.selectedAppId === "string") {
    base.selectedAppId = parsed.selectedAppId;
  } else if (parsed.selectedAppId === null) {
    base.selectedAppId = null;
  }

  if (typeof parsed.draftJd === "string") base.draftJd = parsed.draftJd;
  if (typeof parsed.draftJobUrl === "string")
    base.draftJobUrl = parsed.draftJobUrl;
  if (typeof parsed.draftCompany === "string")
    base.draftCompany = parsed.draftCompany;
  if (typeof parsed.draftTitle === "string")
    base.draftTitle = parsed.draftTitle;
  if (typeof parsed.tailoredResume === "string")
    base.tailoredResume = parsed.tailoredResume;
  if (typeof parsed.generationSourceKey === "string") {
    base.generationSourceKey = parsed.generationSourceKey;
  } else if (parsed.generationSourceKey === null) {
    base.generationSourceKey = null;
  }

  if (parsed.rationale || parsed.rationaleList) {
    base.rationale = normalizeCvRationale(
      parsed.rationale ?? parsed.rationaleList
    );
  }

  if (typeof parsed.coverLetter === "string") {
    base.coverLetter = parsed.coverLetter;
  }
  if (Array.isArray(parsed.interviewQA)) {
    base.interviewQA = parsed.interviewQA as JobApplication["interviewQA"];
  }
  if (parsed.applyPack && typeof parsed.applyPack === "object") {
    base.applyPack = parsed.applyPack as ApplyPack;
  }

  if (typeof parsed.updatedAt === "string") {
    base.updatedAt = parsed.updatedAt;
  }
  base.version = WORKSPACE_VERSION;
  return base;
}

export function readLocalWorkspaceCache(): WorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = [
      LOCAL_CACHE_KEY,
      "job-agent-state-v4",
      "job-agent-state-v3",
      "job-agent-state-v2",
      "job-agent-state-v1",
    ];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      return normalizeWorkspaceSnapshot(JSON.parse(raw));
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeLocalWorkspaceCache(snapshot: WorkspaceSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}
