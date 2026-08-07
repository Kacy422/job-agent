"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildFullExperienceFromProfile,
  migrateToProfile,
} from "@/lib/experience";
import {
  DEFAULT_PROFILE_FROM_CV,
  EMPTY_CV_RATIONALE,
  normalizeCvRationale,
  pipelineToTrackStatus,
  type ApplyPack,
  type CvRationale,
  type Job,
  type JobApplication,
  type ProfileData,
  type TrackStatus,
} from "@/types";

type TabId = "board" | "profile" | "resume" | "apply";

interface AppState {
  tab: TabId;
  setTab: (tab: TabId) => void;
  profile: ProfileData;
  setProfile: (p: ProfileData | ((prev: ProfileData) => ProfileData)) => void;
  updateProfileField: (
    key: import("@/types").ProfileScalarKey,
    value: string
  ) => void;
  fullExperience: string;
  applications: JobApplication[];
  setApplications: (
    apps: JobApplication[] | ((prev: JobApplication[]) => JobApplication[])
  ) => void;
  selectedAppId: string | null;
  selectApp: (id: string | null) => void;
  selectedApp: JobApplication | null;
  upsertApplication: (app: JobApplication) => void;
  /** 始终追加新记录，不覆盖已有 id */
  appendApplication: (app: Omit<JobApplication, "id"> & { id?: string }) => string;
  updateApplication: (id: string, patch: Partial<JobApplication>) => void;
  removeApplication: (id: string) => void;
  draftJd: string;
  setDraftJd: (v: string) => void;
  draftJobUrl: string;
  setDraftJobUrl: (v: string) => void;
  draftCompany: string;
  setDraftCompany: (v: string) => void;
  draftTitle: string;
  setDraftTitle: (v: string) => void;
  tailoredResume: string;
  setTailoredResume: (v: string) => void;
  /** 生成材料时绑定的 JD/URL 指纹；变更则清空工作区 */
  generationSourceKey: string | null;
  setGenerationSourceKey: (k: string | null) => void;
  rationale: CvRationale;
  setRationale: (v: CvRationale) => void;
  /** @deprecated 兼容旧引用 */
  rationaleList: string[];
  setRationaleList: (v: string[]) => void;
  coverLetter: string;
  setCoverLetter: (v: string) => void;
  interviewQA: JobApplication["interviewQA"];
  setInterviewQA: (v: JobApplication["interviewQA"]) => void;
  applyPack: ApplyPack | null;
  setApplyPack: (v: ApplyPack | null) => void;
  agentSessionId: string | null;
  setAgentSessionId: (id: string | null) => void;
  masterCv: string;
  setMasterCv: (v: string) => void;
  extraNotes: string;
  setExtraNotes: (v: string) => void;
  jobs: Job[];
  selectedJobId: string | null;
  selectJob: (id: string | null) => void;
  selectedJob: Job | null;
  updateJob: (id: string, patch: Partial<Job>) => void;
  addJob: (job: Job) => void;
  removeJob: (id: string) => void;
}

const Ctx = createContext<AppState | null>(null);
const STORAGE_KEY = "job-agent-state-v5";

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
    trackStatus: pipelineToTrackStatus(j.pipelineStatus),
    createdAt: j.createdAt,
    updatedAt: j.updatedAt || j.createdAt,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabId>("profile");
  const [profile, setProfile] = useState<ProfileData>(() =>
    structuredClone(DEFAULT_PROFILE_FROM_CV)
  );
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [draftJd, setDraftJd] = useState("");
  const [draftJobUrl, setDraftJobUrl] = useState("");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [generationSourceKey, setGenerationSourceKey] = useState<string | null>(
    null
  );
  const [rationale, setRationale] = useState<CvRationale>(() => ({
    ...EMPTY_CV_RATIONALE,
  }));
  const [coverLetter, setCoverLetter] = useState("");
  const [interviewQA, setInterviewQA] = useState<
    JobApplication["interviewQA"]
  >([]);
  const [applyPack, setApplyPack] = useState<ApplyPack | null>(null);
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const fullExperience = useMemo(
    () => buildFullExperienceFromProfile(profile),
    [profile]
  );

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("job-agent-state-v4") ||
        localStorage.getItem("job-agent-state-v3") ||
        localStorage.getItem("job-agent-state-v2") ||
        localStorage.getItem("job-agent-state-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile(
          migrateToProfile(
            parsed.masterCv || "",
            parsed.extraNotes || "",
            parsed.profile
          )
        );
        if (Array.isArray(parsed.applications)) {
          setApplications(parsed.applications);
        } else if (Array.isArray(parsed.jobs)) {
          setApplications(
            (parsed.jobs as Job[]).map((j) =>
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
            )
          );
        }
        if (parsed.selectedAppId) setSelectedAppId(parsed.selectedAppId);
        if (typeof parsed.draftJd === "string") setDraftJd(parsed.draftJd);
        if (typeof parsed.draftJobUrl === "string")
          setDraftJobUrl(parsed.draftJobUrl);
        if (typeof parsed.draftCompany === "string")
          setDraftCompany(parsed.draftCompany);
        if (typeof parsed.draftTitle === "string")
          setDraftTitle(parsed.draftTitle);
        if (parsed.tailoredResume) setTailoredResume(parsed.tailoredResume);
        if (typeof parsed.generationSourceKey === "string")
          setGenerationSourceKey(parsed.generationSourceKey);
        if (parsed.rationale || parsed.rationaleList) {
          setRationale(
            normalizeCvRationale(parsed.rationale ?? parsed.rationaleList)
          );
        }
        if (typeof parsed.coverLetter === "string")
          setCoverLetter(parsed.coverLetter);
        if (Array.isArray(parsed.interviewQA))
          setInterviewQA(parsed.interviewQA);
        if (parsed.applyPack) setApplyPack(parsed.applyPack);
      } else {
        setProfile(structuredClone(DEFAULT_PROFILE_FROM_CV));
      }
    } catch {
      setProfile(structuredClone(DEFAULT_PROFILE_FROM_CV));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile,
        applications,
        selectedAppId,
        draftJd,
        draftJobUrl,
        draftCompany,
        draftTitle,
        tailoredResume,
        generationSourceKey,
        rationale,
        coverLetter,
        interviewQA,
        applyPack,
      })
    );
  }, [
    hydrated,
    profile,
    applications,
    selectedAppId,
    draftJd,
    draftJobUrl,
    draftCompany,
    draftTitle,
    tailoredResume,
    generationSourceKey,
    rationale,
    coverLetter,
    interviewQA,
    applyPack,
  ]);

  const updateProfileField = useCallback(
    (key: import("@/types").ProfileScalarKey, value: string) => {
      setProfile((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const selectApp = useCallback((id: string | null) => {
    setSelectedAppId(id);
  }, []);

  const upsertApplication = useCallback((app: JobApplication) => {
    setApplications((prev) => {
      const idx = prev.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...app, updatedAt: new Date().toISOString() };
        return next;
      }
      return [app, ...prev];
    });
    setSelectedAppId(app.id);
  }, []);

  /** 同步到求职总结：始终 Append 新记录，禁止覆盖 */
  const appendApplication = useCallback(
    (app: Omit<JobApplication, "id"> & { id?: string }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const record: JobApplication = {
        ...app,
        id,
        createdAt: app.createdAt || now,
        updatedAt: now,
      };
      setApplications((prev) => [record, ...prev]);
      setSelectedAppId(id);
      return id;
    },
    []
  );

  const setRationaleList = useCallback((v: string[]) => {
    setRationale(normalizeCvRationale(v));
  }, []);

  const rationaleList = useMemo(
    () =>
      [...rationale.added, ...rationale.removed].map((item) =>
        item.reason ? `${item.text}（原因：${item.reason}）` : item.text
      ),
    [rationale]
  );

  const updateApplication = useCallback(
    (id: string, patch: Partial<JobApplication>) => {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, ...patch, updatedAt: new Date().toISOString() }
            : a
        )
      );
    },
    []
  );

  const removeApplication = useCallback((id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setSelectedAppId((cur) => (cur === id ? null : cur));
  }, []);

  const selectedApp = useMemo(
    () => applications.find((a) => a.id === selectedAppId) || null,
    [applications, selectedAppId]
  );

  const masterCv = fullExperience;
  const setMasterCv = useCallback((_v: string) => {
    /* no-op: structured profile is source of truth */
  }, []);
  const extraNotes = profile.quickNotes;
  const setExtraNotes = useCallback((v: string) => {
    setProfile((p) => ({ ...p, quickNotes: v }));
  }, []);

  const jobs = useMemo(
    () =>
      applications.map(
        (a): Job => ({
          id: a.id,
          url: a.applyUrl || "",
          applyUrl: a.applyUrl,
          title: a.title,
          company: a.company,
          location: "",
          salary: "",
          source: "tracker",
          tags: [],
          description: a.jd,
          pipelineStatus:
            a.trackStatus === "interview"
              ? "interview"
              : a.trackStatus === "applied"
                ? "submitted"
                : a.trackStatus === "applying"
                  ? "filling"
                  : "resume_ready",
          status:
            a.trackStatus === "interview"
              ? "interview"
              : a.trackStatus === "applied" || a.trackStatus === "applying"
                ? "applied"
                : "wishlist",
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          tailoredResume: a.cvHtml,
          applyPack: a.coverLetter
            ? {
                coverLetter: a.coverLetter,
                whyCompany: "",
                whyRole: "",
                strengthsAnswer: "",
                openQuestions: [],
                formFields: [],
              }
            : undefined,
        })
      ),
    [applications]
  );

  const selectedJob = selectedApp
    ? jobs.find((j) => j.id === selectedApp.id) || null
    : null;

  const selectJob = selectApp;
  const updateJob = useCallback(
    (id: string, patch: Partial<Job>) => {
      const appPatch: Partial<JobApplication> = {};
      if (patch.title) appPatch.title = patch.title;
      if (patch.company) appPatch.company = patch.company;
      if (patch.description) appPatch.jd = patch.description;
      if (patch.tailoredResume) appPatch.cvHtml = patch.tailoredResume;
      if (patch.applyPack?.coverLetter)
        appPatch.coverLetter = patch.applyPack.coverLetter;
      if (patch.pipelineStatus)
        appPatch.trackStatus = pipelineToTrackStatus(patch.pipelineStatus);
      updateApplication(id, appPatch);
    },
    [updateApplication]
  );
  const addJob = useCallback(
    (job: Job) => {
      upsertApplication(jobToApplication(job));
    },
    [upsertApplication]
  );
  const removeJob = removeApplication;

  const value = useMemo(
    () => ({
      tab,
      setTab,
      profile,
      setProfile,
      updateProfileField,
      fullExperience,
      applications,
      setApplications,
      selectedAppId,
      selectApp,
      selectedApp,
      upsertApplication,
      appendApplication,
      updateApplication,
      removeApplication,
      draftJd,
      setDraftJd,
      draftJobUrl,
      setDraftJobUrl,
      draftCompany,
      setDraftCompany,
      draftTitle,
      setDraftTitle,
      tailoredResume,
      setTailoredResume,
      generationSourceKey,
      setGenerationSourceKey,
      rationale,
      setRationale,
      rationaleList,
      setRationaleList,
      coverLetter,
      setCoverLetter,
      interviewQA,
      setInterviewQA,
      applyPack,
      setApplyPack,
      agentSessionId,
      setAgentSessionId,
      masterCv,
      setMasterCv,
      extraNotes,
      setExtraNotes,
      jobs,
      selectedJobId: selectedAppId,
      selectJob,
      selectedJob,
      updateJob,
      addJob,
      removeJob,
    }),
    [
      tab,
      profile,
      updateProfileField,
      fullExperience,
      applications,
      selectedAppId,
      selectApp,
      selectedApp,
      upsertApplication,
      appendApplication,
      updateApplication,
      removeApplication,
      draftJd,
      draftJobUrl,
      draftCompany,
      draftTitle,
      tailoredResume,
      generationSourceKey,
      rationale,
      rationaleList,
      coverLetter,
      interviewQA,
      applyPack,
      agentSessionId,
      masterCv,
      setMasterCv,
      extraNotes,
      setExtraNotes,
      jobs,
      selectJob,
      selectedJob,
      updateJob,
      addJob,
      removeJob,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export type { TabId };
