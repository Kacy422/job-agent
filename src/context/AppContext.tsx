"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildFullExperienceFromProfile } from "@/lib/experience";
import {
  normalizeWorkspaceSnapshot,
  readLocalWorkspaceCache,
  writeLocalWorkspaceCache,
  type WorkspaceSnapshot,
} from "@/lib/workspace-state";
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
} from "@/types";

type TabId = "board" | "profile" | "resume" | "apply";
type SyncStatus = "idle" | "loading" | "saving" | "synced" | "offline" | "error";

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
  appendApplication: (
    app: Omit<JobApplication, "id"> & { id?: string }
  ) => string;
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
  generationSourceKey: string | null;
  setGenerationSourceKey: (k: string | null) => void;
  rationale: CvRationale;
  setRationale: (v: CvRationale) => void;
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
  syncStatus: SyncStatus;
  syncError: string;
  hydrated: boolean;
  /** 立即把当前工作区写入 Redis（供 Save 按钮） */
  saveWorkspaceNow: () => Promise<{ ok: boolean; error?: string }>;
}

const Ctx = createContext<AppState | null>(null);

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

function applySnapshot(
  snap: WorkspaceSnapshot,
  setters: {
    setProfile: (p: ProfileData) => void;
    setApplications: (a: JobApplication[]) => void;
    setSelectedAppId: (id: string | null) => void;
    setDraftJd: (v: string) => void;
    setDraftJobUrl: (v: string) => void;
    setDraftCompany: (v: string) => void;
    setDraftTitle: (v: string) => void;
    setTailoredResume: (v: string) => void;
    setGenerationSourceKey: (k: string | null) => void;
    setRationale: (v: CvRationale) => void;
    setCoverLetter: (v: string) => void;
    setInterviewQA: (v: JobApplication["interviewQA"]) => void;
    setApplyPack: (v: ApplyPack | null) => void;
  }
) {
  setters.setProfile(snap.profile);
  setters.setApplications(snap.applications);
  setters.setSelectedAppId(snap.selectedAppId);
  setters.setDraftJd(snap.draftJd);
  setters.setDraftJobUrl(snap.draftJobUrl);
  setters.setDraftCompany(snap.draftCompany);
  setters.setDraftTitle(snap.draftTitle);
  setters.setTailoredResume(snap.tailoredResume);
  setters.setGenerationSourceKey(snap.generationSourceKey);
  setters.setRationale(snap.rationale);
  setters.setCoverLetter(snap.coverLetter);
  setters.setInterviewQA(snap.interviewQA || []);
  setters.setApplyPack(snap.applyPack);
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(true);

  const fullExperience = useMemo(
    () => buildFullExperienceFromProfile(profile),
    [profile]
  );

  const buildSnapshot = useCallback((): WorkspaceSnapshot => {
    return normalizeWorkspaceSnapshot({
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
      updatedAt: new Date().toISOString(),
    });
  }, [
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

  /** Load: Redis is source of truth; localStorage is offline cache only */
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setSyncStatus("loading");
      const setters = {
        setProfile,
        setApplications,
        setSelectedAppId,
        setDraftJd,
        setDraftJobUrl,
        setDraftCompany,
        setDraftTitle,
        setTailoredResume,
        setGenerationSourceKey,
        setRationale,
        setCoverLetter,
        setInterviewQA,
        setApplyPack,
      };

      const local = readLocalWorkspaceCache();

      try {
        const res = await fetch("/api/workspace", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && json.data) {
          const snap = normalizeWorkspaceSnapshot(json.data);
          applySnapshot(snap, setters);
          writeLocalWorkspaceCache(snap);
          setSyncStatus("synced");
          setSyncError("");
        } else if (res.status === 503 || json.configured === false) {
          if (local) applySnapshot(local, setters);
          setSyncStatus("offline");
          setSyncError(
            String(
              json.error ||
                "Redis 未配置。请在 Vercel 绑定 Upstash 并设置 REST URL/TOKEN"
            )
          );
        } else if (json.empty || (res.ok && !json.data)) {
          if (local) {
            applySnapshot(local, setters);
            try {
              const put = await fetch("/api/workspace", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(local),
              });
              const putJson = await put.json().catch(() => ({}));
              if (put.ok && putJson.ok) {
                setSyncStatus("synced");
                setSyncError("");
              } else {
                setSyncStatus("error");
                setSyncError(
                  String(putJson.error || "首次上传本机数据到云端失败")
                );
              }
            } catch {
              setSyncStatus("error");
              setSyncError("首次上传本机数据到云端失败");
            }
          } else {
            setProfile(structuredClone(DEFAULT_PROFILE_FROM_CV));
            try {
              const snap = normalizeWorkspaceSnapshot({
                profile: structuredClone(DEFAULT_PROFILE_FROM_CV),
              });
              await fetch("/api/workspace", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(snap),
              });
            } catch {
              /* ignore seed failure */
            }
            setSyncStatus("synced");
            setSyncError("");
          }
        } else {
          if (local) applySnapshot(local, setters);
          setSyncStatus("error");
          setSyncError(String(json.error || "读取云端数据失败"));
        }
      } catch {
        if (cancelled) return;
        if (local) applySnapshot(local, setters);
        setSyncStatus("offline");
        setSyncError("无法连接云端 API，已临时使用本机缓存");
      }

      if (!cancelled) {
        skipNextSaveRef.current = true;
        setHydrated(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Persist: always attempt Redis (never permanently stuck offline) */
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const snapshot = buildSnapshot();
    writeLocalWorkspaceCache(snapshot);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const res = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
          setSyncStatus("synced");
          setSyncError("");
        } else if (res.status === 503) {
          setSyncStatus("offline");
          setSyncError(String(json.error || "Redis 未配置"));
        } else {
          setSyncStatus("error");
          setSyncError(String(json.error || "保存到云端失败"));
        }
      } catch {
        setSyncStatus("error");
        setSyncError("保存到云端失败（已写入本机缓存作备份）");
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, buildSnapshot]);

  const saveWorkspaceNow = useCallback(async () => {
    const snapshot = buildSnapshot();
    writeLocalWorkspaceCache(snapshot);
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setSyncStatus("synced");
        setSyncError("");
        return { ok: true as const };
      }
      if (res.status === 503) {
        setSyncStatus("offline");
        const error = String(json.error || "Redis 未配置");
        setSyncError(error);
        return { ok: false as const, error };
      }
      const error = String(json.error || "保存到云端失败");
      setSyncStatus("error");
      setSyncError(error);
      return { ok: false as const, error };
    } catch {
      const error = "保存到云端失败（已写入本机缓存作备份）";
      setSyncStatus("error");
      setSyncError(error);
      return { ok: false as const, error };
    }
  }, [buildSnapshot]);

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
        next[idx] = {
          ...next[idx],
          ...app,
          updatedAt: new Date().toISOString(),
        };
        return next;
      }
      return [app, ...prev];
    });
    setSelectedAppId(app.id);
  }, []);

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
    /* structured profile is source of truth */
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
      syncStatus,
      syncError,
      hydrated,
      saveWorkspaceNow,
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
      syncStatus,
      syncError,
      hydrated,
      saveWorkspaceNow,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export type { TabId, SyncStatus };
