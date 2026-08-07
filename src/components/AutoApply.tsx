"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Play,
  LogIn,
  Square,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  buildApplyFormFields,
  profilePayloadForAgent,
} from "@/lib/apply-profile";
import type { AgentPhase, Job, ProfileData } from "@/types";

const AGENT_HINT =
  "请打开终端在 agent/ 目录运行：python -m uvicorn main:app --port 8000";

function looksLikeUrl(text: string) {
  const t = text.trim();
  return /^https?:\/\//i.test(t) || (/^[\w.-]+\.[a-z]{2,}/i.test(t) && !/\s/.test(t));
}

function normalizeUrl(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

type MissingField = { key: string; label: string; hint?: string };

export function AutoApply() {
  const {
    selectedJob,
    jobs,
    selectJob,
    profile,
    setProfile,
    masterCv,
    fullExperience,
    tailoredResume,
    coverLetter,
    applyPack,
    setApplyPack,
    setTab,
    updateJob,
    addJob,
    agentSessionId,
    setAgentSessionId,
  } = useApp();

  const [agentLoading, setAgentLoading] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [reconnectLoading, setReconnectLoading] = useState(false);
  const [error, setError] = useState("");
  const [agentOffline, setAgentOffline] = useState(false);
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [agentMessage, setAgentMessage] = useState("");
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const [applyUrlOverride, setApplyUrlOverride] = useState("");
  const [workspaceCompany, setWorkspaceCompany] = useState("");
  const [workspaceTitle, setWorkspaceTitle] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [supplementAnswers, setSupplementAnswers] = useState<
    Record<string, string>
  >({});
  const [showSupplement, setShowSupplement] = useState(false);

  const boundUrlRef = useRef("");
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipUrlResetRef = useRef(false);
  const agentSessionIdRef = useRef(agentSessionId);
  agentSessionIdRef.current = agentSessionId;

  const displayCompany = workspaceCompany || selectedJob?.company || "";
  const displayTitle = workspaceTitle || selectedJob?.title || "";

  function pushLog(line: string) {
    const stamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${stamp}] ${line}`, ...prev].slice(0, 40));
  }

  const resetAgentRuntime = useCallback(() => {
    const sid = agentSessionIdRef.current;
    if (sid) {
      void fetch("/api/agent-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId: sid }),
      }).catch(() => undefined);
    }
    setPhase("idle");
    setAgentMessage("");
    setFilledFields([]);
    setAgentSessionId(null);
    setMissingFields([]);
    setShowSupplement(false);
  }, [setAgentSessionId]);

  const checkAgentHealth = useCallback(async (silent = false) => {
    if (!silent) setReconnectLoading(true);
    try {
      const res = await fetch("/api/agent-proxy?action=health");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        setAgentOffline(false);
        setError((prev) =>
          /Agent 服务|uvicorn|8000|未连接|未启动/i.test(prev) ? "" : prev
        );
        return true;
      }
      setAgentOffline(true);
      if (!silent) setError(String(data.error || AGENT_HINT));
      return false;
    } catch {
      setAgentOffline(true);
      if (!silent) setError(AGENT_HINT);
      return false;
    } finally {
      if (!silent) setReconnectLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAgentHealth(true);
    const timer = setInterval(() => {
      void checkAgentHealth(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [checkAgentHealth]);

  useEffect(() => {
    if (!selectedJob) return;
    skipUrlResetRef.current = true;
    const url = selectedJob.applyUrl || selectedJob.url || "";
    setApplyUrlOverride(url);
    boundUrlRef.current = normalizeUrl(url);
    setWorkspaceCompany(selectedJob.company || "");
    setWorkspaceTitle(selectedJob.title || "");
    setApplyPack(null);
    resetAgentRuntime();
  }, [selectedJob?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!agentSessionId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/agent-proxy?action=status&sessionId=${encodeURIComponent(agentSessionId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (
            res.status === 503 ||
            /Agent 服务|uvicorn|8000/i.test(String(data.error || ""))
          ) {
            setAgentOffline(true);
            setError(String(data.error || AGENT_HINT));
          }
          return;
        }
        setAgentOffline(false);
        const nextPhase = (data.phase || "idle") as AgentPhase;
        setPhase(nextPhase);
        setAgentMessage(data.message || "");
        setFilledFields(data.filledFields || []);
        if (
          nextPhase === "awaiting_profile" &&
          Array.isArray(data.missingFields) &&
          data.missingFields.length
        ) {
          setMissingFields(data.missingFields);
          setShowSupplement(true);
        }
        if (selectedJob && nextPhase === "filling") {
          updateJob(selectedJob.id, { pipelineStatus: "filling" });
        }
        if (selectedJob && nextPhase === "filled") {
          updateJob(selectedJob.id, { pipelineStatus: "filled" });
        }
        if (nextPhase === "error") {
          setError(data.error || data.message || "Agent 出错");
        }
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [agentSessionId, selectedJob, updateJob]);

  async function parseNewUrl(rawUrl: string) {
    const url = normalizeUrl(rawUrl);
    if (!url || !looksLikeUrl(url)) return;
    setParsingUrl(true);
    setError("");
    pushLog(`Parsing URL: ${url}`);
    try {
      const res = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWorkspaceCompany("");
        setWorkspaceTitle("");
        pushLog("URL parse soft-failed — select a job manually");
        return;
      }
      const job = data.job || data;
      const company = String(job.company || "").trim();
      const title = String(job.title || "").trim();
      setWorkspaceCompany(company);
      setWorkspaceTitle(title);

      const now = new Date().toISOString();
      const newJob: Job = {
        id: crypto.randomUUID(),
        url,
        applyUrl: String(job.applyUrl || url),
        title: title || "未识别岗位",
        company: company || "未知公司",
        location: String(job.location || ""),
        salary: String(job.salary || ""),
        source: "URL 解析",
        tags: Array.isArray(job.tags) ? job.tags : [],
        description: String(job.description || ""),
        keywords: Array.isArray(job.keywords) ? job.keywords : [],
        matchScore: typeof job.matchScore === "number" ? job.matchScore : 0,
        pipelineStatus: "matched",
        status: "wishlist",
        createdAt: now,
        updatedAt: now,
      };
      skipUrlResetRef.current = true;
      addJob(newJob);
      selectJob(newJob.id);
      boundUrlRef.current = url;
      pushLog(`Bound job: ${newJob.company} · ${newJob.title}`);
    } catch {
      pushLog("URL parse error");
    } finally {
      setParsingUrl(false);
    }
  }

  function handleUrlChange(value: string) {
    setApplyUrlOverride(value);
    if (skipUrlResetRef.current) {
      skipUrlResetRef.current = false;
      return;
    }
    const next = normalizeUrl(value);
    const prev = boundUrlRef.current;
    if (!next) {
      setApplyPack(null);
      resetAgentRuntime();
      setWorkspaceCompany("");
      setWorkspaceTitle("");
      selectJob(null);
      boundUrlRef.current = "";
      return;
    }
    if (next === prev) return;

    setApplyPack(null);
    resetAgentRuntime();
    setWorkspaceCompany("");
    setWorkspaceTitle("");
    selectJob(null);
    boundUrlRef.current = next;
    setError("");
    setLogs([]);
    pushLog("Workspace reset for new URL");

    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    parseTimerRef.current = setTimeout(() => {
      parseNewUrl(next);
    }, 600);
  }

  function handleSelectJob(id: string) {
    skipUrlResetRef.current = true;
    selectJob(id || null);
    setApplyPack(null);
    resetAgentRuntime();
    setError("");
    setLogs([]);
  }

  async function startAgent() {
    const online = await checkAgentHealth(true);
    if (!online) {
      setAgentOffline(true);
      setError(AGENT_HINT);
      return;
    }
    if (!selectedJob && !displayTitle) {
      setError("请先选择或解析岗位");
      return;
    }
    const targetUrl =
      normalizeUrl(applyUrlOverride) ||
      selectedJob?.applyUrl ||
      selectedJob?.url ||
      "";
    if (!targetUrl || targetUrl.startsWith("manual://")) {
      setError("请填写有效的网申 URL");
      return;
    }

    setAgentLoading(true);
    setError("");
    pushLog("Starting browser agent…");
    try {
      const formFields = buildApplyFormFields(profile, {
        jobTitle: displayTitle || selectedJob?.title,
        company: displayCompany || selectedJob?.company,
      });

      const res = await fetch("/api/agent-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          jobId: selectedJob?.id || crypto.randomUUID(),
          applyUrl: targetUrl,
          masterCv: tailoredResume || fullExperience || masterCv,
          coverLetter: coverLetter || applyPack?.coverLetter || "",
          formFields: applyPack?.formFields?.length
            ? [...formFields, ...applyPack.formFields]
            : formFields,
          openQuestions: applyPack?.openQuestions || [],
          whyCompany: applyPack?.whyCompany || "",
          whyRole: applyPack?.whyRole || "",
          strengthsAnswer: applyPack?.strengthsAnswer || "",
          jobTitle: displayTitle || selectedJob?.title,
          company: displayCompany || selectedJob?.company,
          profile: profilePayloadForAgent(profile),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = String(data.error || "启动 Agent 失败");
        if (/Agent 服务|uvicorn|8000|ECONNREFUSED|fetch failed/i.test(msg)) {
          setAgentOffline(true);
          setError(AGENT_HINT);
        } else {
          setError(msg);
        }
        return;
      }
      setAgentOffline(false);
      setAgentSessionId(data.sessionId);
      setPhase(data.phase || "awaiting_login");
      setAgentMessage(data.message || "浏览器已打开，请手动登录");
      pushLog("Browser opened — complete login, then 开始填表");
      if (selectedJob) {
        updateJob(selectedJob.id, { pipelineStatus: "filling" });
      }
    } catch (e) {
      setAgentOffline(true);
      setError(AGENT_HINT);
      pushLog(e instanceof Error ? e.message : "start failed");
    } finally {
      setAgentLoading(false);
    }
  }

  async function confirmLogin() {
    if (!agentSessionId) return;
    setAgentLoading(true);
    setError("");
    pushLog("Confirm login → scan & fill");
    try {
      const res = await fetch("/api/agent-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-login",
          sessionId: agentSessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "确认登录失败");
      setPhase(data.phase || "filling");
      setAgentMessage(data.message || "");
      setFilledFields(data.filledFields || []);
      if (
        data.phase === "awaiting_profile" &&
        Array.isArray(data.missingFields)
      ) {
        setMissingFields(data.missingFields);
        setSupplementAnswers({});
        setShowSupplement(true);
        pushLog("Waiting for profile supplement");
      } else {
        pushLog(data.message || "Filling…");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "确认失败");
    } finally {
      setAgentLoading(false);
    }
  }

  async function submitSupplement(skip = false) {
    if (!agentSessionId) return;
    setAgentLoading(true);
    try {
      const patch: Partial<ProfileData> = {};
      const answers = { ...supplementAnswers };
      const keyToProfile: Record<string, keyof ProfileData> = {
        title: "title",
        surname: "surname",
        given_name: "givenName",
        preferred_name: "preferredName",
        hkid: "hkid",
        passport: "passport",
        work_visa_status: "workVisaStatus",
        available_date: "availableDate",
        expected_salary: "expectedSalary",
      };
      for (const [k, v] of Object.entries(answers)) {
        if (!v.trim()) continue;
        const pk = keyToProfile[k];
        if (pk) (patch as Record<string, string>)[pk] = v.trim();
      }
      const nextExtras = { ...(profile.applyExtras || {}) };
      for (const [k, v] of Object.entries(answers)) {
        if (v.trim()) nextExtras[k] = v.trim();
      }
      if (Object.keys(patch).length || Object.keys(nextExtras).length) {
        setProfile((prev) => ({
          ...prev,
          ...patch,
          applyExtras: { ...prev.applyExtras, ...nextExtras },
        }));
      }

      const res = await fetch("/api/agent-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "provide-profile",
          sessionId: agentSessionId,
          profile: profilePayloadForAgent({
            ...profile,
            ...patch,
            applyExtras: { ...profile.applyExtras, ...nextExtras },
          } as ProfileData),
          answers,
          skipMissing: skip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "补充画像失败");
      setPhase(data.phase || "filling");
      setAgentMessage(data.message || "");
      setFilledFields(data.filledFields || []);
      if (data.phase === "awaiting_profile" && data.missingFields?.length) {
        setMissingFields(data.missingFields);
        pushLog("Still missing profile fields");
      } else {
        setShowSupplement(false);
        setMissingFields([]);
        pushLog(data.message || "Fill continued");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "补充失败");
    } finally {
      setAgentLoading(false);
    }
  }

  async function stopAgent() {
    if (!agentSessionId) return;
    setAgentLoading(true);
    try {
      await fetch("/api/agent-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId: agentSessionId }),
      });
      setPhase("stopped");
      setAgentMessage("已停止");
      setAgentSessionId(null);
      setShowSupplement(false);
      pushLog("Agent stopped");
    } catch (e) {
      setError(e instanceof Error ? e.message : "停止失败");
    } finally {
      setAgentLoading(false);
    }
  }

  function markSubmitted() {
    if (!selectedJob) return;
    updateJob(selectedJob.id, { pipelineStatus: "submitted" });
    pushLog("Marked as submitted");
  }

  const phaseLabel: Record<AgentPhase, string> = {
    idle: "待命",
    opening: "打开浏览器…",
    awaiting_login: "请登录后点击「开始填表」",
    awaiting_profile: "请补充个人画像",
    filling: "正在填表…",
    filled: "填表完成 · 请手动提交",
    error: "出错",
    stopped: "已停止",
  };

  const startDisabled =
    agentLoading ||
    agentOffline ||
    phase === "filling" ||
    phase === "awaiting_login" ||
    phase === "awaiting_profile";

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-md">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-teal-50/90 px-3 py-1 text-xs font-semibold tracking-wide text-teal-800">
          AI Browser Agent
        </span>
        <h2 className="font-sans text-3xl font-extrabold tracking-tight text-slate-900">
          自动网申
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          仅保留岗位选择与自动化控制台。填表数据来自人物画像（Title / Surname /
          Given Name 等）。
        </p>
      </div>

      {(error || agentOffline) && (
        <div className="mb-4 rounded-2xl border border-rose-100/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 shadow-glass">
          <div className="flex flex-wrap items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {agentOffline ? "Agent 服务未连接" : "操作失败"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-rose-700/90">
                {error || AGENT_HINT}
              </p>
              {agentOffline && (
                <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 font-mono text-xs text-slate-700">
                  cd agent && python -m uvicorn main:app --port 8000
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => checkAgentHealth(false)}
              disabled={reconnectLoading}
              className="soft-btn shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs text-rose-800"
            >
              {reconnectLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              重新连接 Agent 服务
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="glass-panel p-4">
          <label className="mb-1.5 block text-xs font-medium tracking-wide text-slate-500">
            目标岗位
          </label>
          <select
            className="soft-input w-full py-3"
            value={selectedJob?.id || ""}
            onChange={(e) => handleSelectJob(e.target.value)}
          >
            <option value="">请选择岗位…</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} · {j.company}
              </option>
            ))}
          </select>
          {(displayCompany || displayTitle) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {displayCompany && (
                <span className="soft-tag border-amber-200/60 bg-amber-50 text-sm font-semibold text-amber-800">
                  {displayCompany}
                </span>
              )}
              {displayTitle && (
                <span className="soft-tag border-slate-200 bg-slate-100 text-xs text-slate-700">
                  {displayTitle}
                </span>
              )}
              {parsingUrl && (
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  解析 URL…
                </span>
              )}
            </div>
          )}
          {jobs.length === 0 && !parsingUrl && (
            <button
              type="button"
              onClick={() => setTab("resume")}
              className="mt-2 inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"
            >
              去专属简历追加岗位
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="glass-panel p-4">
          <label className="mb-1.5 block text-xs font-medium tracking-wide text-slate-500">
            网申 URL
          </label>
          <input
            value={applyUrlOverride}
            onChange={(e) => handleUrlChange(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (text?.trim()) {
                e.preventDefault();
                handleUrlChange(text.trim());
              }
            }}
            placeholder="粘贴新 URL 将重置工作区…"
            className="soft-input w-full py-3"
          />
        </div>
      </div>

      <div className="glass-panel mb-6 p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          自动化控制台
        </h3>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startAgent}
            disabled={startDisabled}
            className="soft-btn-accent px-5"
            title={agentOffline ? AGENT_HINT : undefined}
          >
            {agentLoading && phase === "idle" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            启动填表
          </button>
          <button
            type="button"
            onClick={confirmLogin}
            disabled={
              !agentSessionId || phase !== "awaiting_login" || agentLoading
            }
            className="soft-btn-ghost"
          >
            <LogIn className="h-4 w-4" />
            开始填表
          </button>
          <button
            type="button"
            onClick={stopAgent}
            disabled={!agentSessionId || agentLoading}
            className="soft-btn rounded-2xl border border-rose-200/60 bg-rose-50/80 px-4 py-2.5 text-rose-700"
          >
            <Square className="h-4 w-4" />
            停止
          </button>
          <button
            type="button"
            onClick={() => checkAgentHealth(false)}
            disabled={reconnectLoading}
            className="soft-btn-ghost"
          >
            {reconnectLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            重新连接
          </button>
          {phase === "filled" && (
            <button
              type="button"
              onClick={markSubmitted}
              className="soft-btn rounded-2xl bg-emerald-500 px-4 py-2.5 text-white"
            >
              <Check className="h-4 w-4" />
              已提交
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-700">
          <Bot className="h-4 w-4 text-teal-700" />
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              agentOffline ? "bg-rose-500" : "bg-emerald-500"
            }`}
          />
          <span className="font-medium">
            {agentOffline ? "Agent 离线" : phaseLabel[phase]}
          </span>
          {agentMessage && !agentOffline && (
            <span className="text-slate-500">· {agentMessage}</span>
          )}
          {applyUrlOverride && (
            <a
              href={normalizeUrl(applyUrlOverride) || applyUrlOverride}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
            >
              打开网申页 <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {filledFields.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filledFields.map((f) => (
              <span
                key={f}
                className="rounded-xl border border-teal-200/50 bg-teal-50 px-2.5 py-1 text-xs text-teal-800"
              >
                已填：{f}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/50 bg-slate-950 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-200">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
            Agent Log
          </p>
          {logs.length === 0 ? (
            <p className="text-slate-500">No activity yet.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {logs.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showSupplement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              补充个人画像
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              网申表单出现了画像库中尚未填写的常见字段。填写后将保存并继续自动填表。
            </p>
            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto">
              {missingFields.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    {f.label}
                  </span>
                  <input
                    className="soft-input w-full"
                    value={supplementAnswers[f.key] || ""}
                    onChange={(e) =>
                      setSupplementAnswers((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    placeholder={f.hint || f.label}
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => submitSupplement(true)}
                disabled={agentLoading}
                className="soft-btn-ghost"
              >
                跳过并继续
              </button>
              <button
                type="button"
                onClick={() => submitSupplement(false)}
                disabled={agentLoading}
                className="soft-btn-primary px-5"
              >
                {agentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                保存并继续填表
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
