"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Download,
  Wand2,
  ArrowLeft,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Mail,
  Mic,
  Save,
  Link2,
  Search,
  FileText,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { EditableCvPreview } from "@/components/EditableCvPreview";
import { PageHeader } from "@/components/PageHeader";
import {
  exportHtmlPdf,
  exportHtmlWord,
  wrapPlainAsDoc,
} from "@/lib/export";
import { isValidCompanyName, isValidJobTitle } from "@/lib/job-meta";
import {
  EMPTY_CV_RATIONALE,
  formatRationaleLine,
  isCvRationaleEmpty,
  normalizeCvRationale,
  type CvRationaleItem,
  type JobApplication,
} from "@/types";

const SHORT_JD_HINT =
  "已根据链接预填公司/岗位。若 JD 文本过短，请将网页上的完整 Job Description 粘贴到下方框内以获得更精准匹配。";

function looksLikeUrl(text: string) {
  const t = text.trim();
  return /^https?:\/\//i.test(t) || (/^[\w.-]+\.[a-z]{2,}/i.test(t) && !/\s/.test(t));
}

function normalizeUrl(raw: string) {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function ResumeGenerator() {
  const {
    fullExperience,
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
    rationale,
    setRationale,
    coverLetter,
    setCoverLetter,
    interviewQA,
    setInterviewQA,
    setTab,
    appendApplication,
    generationSourceKey,
    setGenerationSourceKey,
  } = useApp();

  const [loadingCv, setLoadingCv] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [loadingParse, setLoadingParse] = useState(false);
  const [error, setError] = useState("");
  const [cvEpoch, setCvEpoch] = useState(0);
  const [resumeHtml, setResumeHtml] = useState("");
  const [showRationale, setShowRationale] = useState(true);
  const [savedHint, setSavedHint] = useState("");
  const [parseHint, setParseHint] = useState("");
  const [cachedParsedJd, setCachedParsedJd] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [loadingRefine, setLoadingRefine] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const clearingRef = useRef(false);
  const urlParseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFillJdRef = useRef(false);

  const hasCv = Boolean(resumeHtml || tailoredResume?.includes("cv-sheet"));
  const hasArtifacts = Boolean(
    hasCv ||
      coverLetter ||
      (interviewQA && interviewQA.length) ||
      !isCvRationaleEmpty(rationale)
  );

  function sourceKey(url = draftJobUrl, jd = draftJd) {
    return `${url.trim()}\n${jd.trim()}`;
  }

  function clearGeneratedWorkspace() {
    if (clearingRef.current) return;
    clearingRef.current = true;
    setResumeHtml("");
    setTailoredResume("");
    setCoverLetter("");
    setInterviewQA([]);
    setRationale({ ...EMPTY_CV_RATIONALE });
    setShowRationale(false);
    setCvEpoch((n) => n + 1);
    setGenerationSourceKey(null);
    setParseHint("");
    setTimeout(() => {
      clearingRef.current = false;
    }, 0);
  }

  /** Force-clear at the start of any new parse / recognize */
  function beginNewJobParse() {
    clearGeneratedWorkspace();
    setCachedParsedJd("");
    setError("");
  }

  function bindGenerationSource() {
    setGenerationSourceKey(sourceKey());
  }

  /** 输入新 JD / URL 时自动隔离工作区 */
  useEffect(() => {
    if (!generationSourceKey) return;
    const key = sourceKey();
    if (!key.trim() || key === "\n") {
      if (hasArtifacts) clearGeneratedWorkspace();
      return;
    }
    if (key !== generationSourceKey && hasArtifacts) {
      clearGeneratedWorkspace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftJd, draftJobUrl]);

  useEffect(() => {
    if (tailoredResume?.includes("cv-sheet") && !resumeHtml) {
      setResumeHtml(tailoredResume);
      setCvEpoch((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailoredResume]);

  const jdOrUrl = draftJd.trim() || draftJobUrl.trim() || cachedParsedJd.trim();
  const canRewrite = Boolean(fullExperience.trim() && jdOrUrl);
  const canParseUrl = Boolean(draftJobUrl.trim());
  const canRecognizeMeta = Boolean(
    draftJd.trim() && !looksLikeUrl(draftJd.trim())
  );

  function meaningfulTextLen(text: string) {
    return text.replace(/\s+/g, "").length;
  }

  function applyParsedMeta(company: string, title: string) {
    if (isValidCompanyName(company)) setDraftCompany(company.trim());
    if (isValidJobTitle(title)) setDraftTitle(title.trim());
  }

  /** 粘贴/输入 Job URL 后自动抓取 JD 并填入下方文本框（保留 URL） */
  function onUrlChange(value: string) {
    setDraftJobUrl(value);
    const trimmed = value.trim();
    if (!trimmed) {
      if (urlParseTimerRef.current) clearTimeout(urlParseTimerRef.current);
      return;
    }
    if (!looksLikeUrl(trimmed)) return;

    if (urlParseTimerRef.current) clearTimeout(urlParseTimerRef.current);
    urlParseTimerRef.current = setTimeout(() => {
      void autoExtractJdFromUrl(trimmed);
    }, 500);
  }

  /** 手动编辑 JD 时不再清空 URL（URL 仍作网申链接） */
  function onJdChange(value: string) {
    if (autoFillJdRef.current) {
      autoFillJdRef.current = false;
    }
    setDraftJd(value);
  }

  async function autoExtractJdFromUrl(rawUrl: string) {
    const url = normalizeUrl(rawUrl);
    if (!url || !looksLikeUrl(url)) return;
    beginNewJobParse();
    setLoadingParse(true);
    setError("");
    setParseHint("正在从链接提取 JD…");
    try {
      const res = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "岗位解析失败");

      const job = data.job || data;
      const softFallback = Boolean(data.softFallback || data.shortJd);
      const hint = String(data.hint || "").trim();
      const jd = String(
        job.description || data.description || data.jd || data.rawText || ""
      ).trim();
      const company = String(job.company || data.company || "").trim();
      const title = String(
        job.title || data.title || data.jobTitle || ""
      ).trim();

      applyParsedMeta(company, title);
      setCachedParsedJd(jd);

      if (jd && meaningfulTextLen(jd) >= 40) {
        autoFillJdRef.current = true;
        setDraftJd(jd);
        setParseHint(
          softFallback
            ? hint || SHORT_JD_HINT
            : `已自动提取 JD（${company || "公司未识别"} · ${title || "岗位未识别"}），可继续编辑后生成 CV`
        );
      } else {
        setParseHint(hint || SHORT_JD_HINT);
      }
      setTimeout(() => setParseHint(""), 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "链接解析失败");
      setParseHint("");
    } finally {
      setLoadingParse(false);
    }
  }

  async function parseJobInput(opts?: {
    allowEmptyJd?: boolean;
    source?: "url" | "jd";
  }): Promise<{
    jd: string;
    company?: string;
    title?: string;
    applyUrl?: string;
    softFallback?: boolean;
    hint?: string;
  }> {
    const source =
      opts?.source ||
      (draftJobUrl.trim() ? "url" : draftJd.trim() ? "jd" : null);

    if (!source) {
      throw new Error("请先粘贴岗位网址或 JD 描述（二选一）");
    }

    // Single data source only — save tokens
    const body: Record<string, string> = {};
    if (source === "url") {
      body.url = normalizeUrl(draftJobUrl.trim());
    } else {
      const jdInput = draftJd.trim();
      if (looksLikeUrl(jdInput)) {
        body.url = normalizeUrl(jdInput);
      } else {
        body.manualJd = jdInput;
      }
    }

    const res = await fetch("/api/parse-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "岗位解析失败");

    const job = data.job || data;
    const softFallback = Boolean(data.softFallback || data.shortJd);
    const hint = String(data.hint || "").trim();
    const jd = String(
      job.description || data.description || data.jd || data.rawText || ""
    ).trim();
    const company = String(job.company || data.company || "").trim();
    const title = String(
      job.title || data.title || data.jobTitle || ""
    ).trim();

    applyParsedMeta(company, title);

    // Cache scraped JD for generate — do NOT put into JD box (keeps exclusivity)
    if (source === "url" && jd) {
      setCachedParsedJd(jd);
    }

    const finalUrl =
      source === "url"
        ? normalizeUrl(draftJobUrl.trim())
        : String(job.applyUrl || data.applyUrl || "");

    const finalJd =
      source === "jd"
        ? draftJd.trim()
        : jd && !softFallback && meaningfulTextLen(jd) >= 50
          ? jd
          : jd;

    if (!finalJd && !softFallback && !opts?.allowEmptyJd) {
      throw new Error("未能提取到 JD 文本，请直接粘贴岗位描述");
    }

    return {
      jd: finalJd,
      company: isValidCompanyName(company) ? company : undefined,
      title: isValidJobTitle(title) ? title : undefined,
      applyUrl: finalUrl,
      softFallback,
      hint: hint || (softFallback ? SHORT_JD_HINT : undefined),
    };
  }

  async function handleParseUrl() {
    if (!canParseUrl) {
      setError("请先在 URL 框粘贴岗位链接");
      return;
    }
    await autoExtractJdFromUrl(draftJobUrl.trim());
  }

  async function handleRecognizeMeta() {
    if (!canRecognizeMeta) {
      setError("请先在 JD 框粘贴岗位文本，再点击识别");
      return;
    }
    beginNewJobParse();
    setLoadingParse(true);
    try {
      const resolved = await parseJobInput({
        allowEmptyJd: true,
        source: "jd",
      });
      if (resolved.company || resolved.title) {
        setParseHint(
          `已识别：${resolved.company || "公司未识别"} · ${resolved.title || "岗位未识别"}（可手动修改）`
        );
      } else {
        setParseHint("未能可靠识别公司/岗位，请手动填写顶部输入框");
      }
      setTimeout(() => setParseHint(""), 7000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "识别失败");
    } finally {
      setLoadingParse(false);
    }
  }

  async function resolveJd(): Promise<{
    jd: string;
    company?: string;
    title?: string;
    applyUrl?: string;
  }> {
    // Prefer filled JD text; fall back to cached scrape / URL parse
    if (meaningfulTextLen(draftJd) >= 50) {
      return {
        jd: draftJd.trim(),
        company: draftCompany,
        title: draftTitle,
        applyUrl: draftJobUrl.trim()
          ? normalizeUrl(draftJobUrl.trim())
          : undefined,
      };
    }

    if (draftJobUrl.trim()) {
      if (meaningfulTextLen(cachedParsedJd) >= 50) {
        return {
          jd: cachedParsedJd,
          company: draftCompany,
          title: draftTitle,
          applyUrl: normalizeUrl(draftJobUrl.trim()),
        };
      }
      const resolved = await parseJobInput({
        allowEmptyJd: true,
        source: "url",
      });
      if (!resolved.jd?.trim() || meaningfulTextLen(resolved.jd) < 50) {
        throw new Error(resolved.hint || SHORT_JD_HINT);
      }
      if (resolved.jd) {
        autoFillJdRef.current = true;
        setDraftJd(resolved.jd);
        setCachedParsedJd(resolved.jd);
      }
      return resolved;
    }

    if (draftJd.trim()) {
      return {
        jd: draftJd.trim(),
        company: draftCompany,
        title: draftTitle,
        applyUrl: draftJobUrl.trim()
          ? normalizeUrl(draftJobUrl.trim())
          : undefined,
      };
    }

    throw new Error("请粘贴岗位网址（自动提取 JD）或手动粘贴 JD");
  }

  async function applyCvResult(data: {
    tailoredResumeHtml?: string;
    rationale?: unknown;
    rationaleList?: unknown;
  }) {
    const html = String(data.tailoredResumeHtml || "");
    setResumeHtml(html);
    setTailoredResume(html);
    setRationale(normalizeCvRationale(data.rationale ?? data.rationaleList));
    bindGenerationSource();
    setShowRationale(true);
    setCvEpoch((n) => n + 1);
  }

  async function rewriteCv() {
    if (!fullExperience.trim()) {
      setError("请先在「人物画像」填写结构化经历");
      return;
    }
    if (!jdOrUrl) {
      setError("请粘贴岗位网址或 JD 描述");
      return;
    }
    setLoadingCv(true);
    setError("");
    try {
      const resolved = await resolveJd();
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: resolved.jd, resume: fullExperience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      await applyCvResult(data);
      setRevisionNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoadingCv(false);
    }
  }

  async function refineCv() {
    if (!hasCv) {
      setError("请先生成初稿 CV");
      return;
    }
    if (!revisionNotes.trim()) {
      setError("请填写手动修改需求，例如：强调 GIS 数据分析经验");
      return;
    }
    if (!fullExperience.trim()) {
      setError("请先在「人物画像」填写结构化经历");
      return;
    }
    setLoadingRefine(true);
    setError("");
    try {
      const resolved = await resolveJd();
      const current =
        exportRef.current?.innerHTML?.trim() ||
        resumeHtml ||
        tailoredResume ||
        "";
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: resolved.jd,
          resume: fullExperience,
          currentCvHtml: current,
          revisionNotes: revisionNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重新优化失败");
      await applyCvResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "重新优化失败");
    } finally {
      setLoadingRefine(false);
    }
  }

  async function genCover() {
    if (!canRewrite) {
      setError("需要岗位 JD（或网址）与人物画像全量经历");
      return;
    }
    setLoadingCover(true);
    setError("");
    try {
      const resolved = await resolveJd();
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: resolved.jd,
          resume: fullExperience,
          company: draftCompany || resolved.company || "the company",
          jobTitle: draftTitle || resolved.title || "the role",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setCoverLetter(String(data.coverLetter || ""));
      bindGenerationSource();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover Letter 生成失败");
    } finally {
      setLoadingCover(false);
    }
  }

  async function genInterview() {
    if (!canRewrite) {
      setError("需要岗位 JD（或网址）与人物画像全量经历");
      return;
    }
    setLoadingInterview(true);
    setError("");
    try {
      const resolved = await resolveJd();
      const res = await fetch("/api/generate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: resolved.jd,
          resume: fullExperience,
          jobTitle: draftTitle || resolved.title || "the role",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setInterviewQA(data.interviewQA || []);
      bindGenerationSource();
    } catch (e) {
      setError(e instanceof Error ? e.message : "面试题生成失败");
    } finally {
      setLoadingInterview(false);
    }
  }

  function saveToTracker() {
    const liveHtml =
      exportRef.current?.innerHTML?.trim() ||
      resumeHtml ||
      tailoredResume ||
      "";
    if (!liveHtml && !coverLetter && !(interviewQA && interviewQA.length)) {
      setError("暂无材料可保存，请先生成 CV / Cover Letter / 面试题");
      return;
    }
    const now = new Date().toISOString();
    const app: Omit<JobApplication, "id"> = {
      company: draftCompany.trim() || "未命名公司",
      title: draftTitle.trim() || "未命名岗位",
      jd: draftJd || cachedParsedJd,
      applyUrl: draftJobUrl || undefined,
      cvHtml: liveHtml || undefined,
      coverLetter: coverLetter || undefined,
      rationale: isCvRationaleEmpty(rationale) ? undefined : rationale,
      interviewQA: interviewQA?.length ? interviewQA : undefined,
      trackStatus: "preparing",
      createdAt: now,
      updatedAt: now,
    };
    appendApplication(app);
    setSavedHint(`已追加到求职进度：${app.company} · ${app.title}`);
    setTimeout(() => setSavedHint(""), 2500);
  }

  function liveCvHtml() {
    return (
      exportRef.current?.innerHTML?.trim() ||
      resumeHtml.trim() ||
      tailoredResume ||
      ""
    );
  }

  function exportCvPdf() {
    const html = liveCvHtml();
    if (!html) {
      setError("暂无 CV 可导出");
      return;
    }
    if (!exportHtmlPdf(html, "CV")) setError("浏览器拦截了弹窗");
  }

  function exportCvWord() {
    const html = liveCvHtml();
    if (!html) {
      setError("暂无 CV 可导出");
      return;
    }
    exportHtmlWord(html, `${draftCompany || "CV"}-${draftTitle || "Resume"}.doc`);
  }

  async function copyCvText() {
    const el = exportRef.current;
    const text = el?.innerText?.trim() || "";
    if (!text) {
      setError("暂无 CV 可复制");
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopiedKey("cv");
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function exportCoverPdf() {
    if (!coverLetter) return;
    exportHtmlPdf(wrapPlainAsDoc(coverLetter), "Cover Letter");
  }

  function exportCoverWord() {
    if (!coverLetter) return;
    exportHtmlWord(
      wrapPlainAsDoc(coverLetter),
      `${draftCompany || "CoverLetter"}.doc`
    );
  }

  async function copyCover() {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopiedKey("cl");
    setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <PageHeader
        emoji="📝"
        step="步骤 2 · 专属简历"
        title="一键改写 CV · 按需生成其他材料"
        description="粘贴岗位链接将自动提取 JD 并填入下方；再根据 JD 深度定制 CV，支持二次手动优化。"
        accent="teal"
        actions={
          <>
            <button
              type="button"
              onClick={() => setTab("profile")}
              className="soft-btn-ghost"
            >
              <ArrowLeft className="h-4 w-4" />
              人物画像
            </button>
            <button
              type="button"
              onClick={saveToTracker}
              className="soft-btn rounded-2xl border border-teal-200/60 bg-teal-50/80 px-4 py-2.5 text-teal-900 shadow-glass backdrop-blur-md hover:bg-teal-50"
            >
              <Save className="h-4 w-4" />
              追加到求职进度
            </button>
          </>
        }
      />

      {!fullExperience.trim() && (
        <p className="mb-4 rounded-2xl border border-amber-200/50 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 shadow-glass backdrop-blur-md">
          人物画像为空。
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setTab("profile")}
          >
            前往填写
          </button>
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-rose-100/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-glass">
          {error}
        </p>
      )}
      {savedHint && (
        <p className="mb-4 rounded-2xl border border-emerald-100/60 bg-emerald-50/80 px-4 py-2 text-sm text-emerald-800 shadow-glass">
          {savedHint}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)]">
        <div className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="mb-3 font-display text-xl text-slate-900">
              目标岗位
            </h3>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <input
                value={draftCompany}
                onChange={(e) => setDraftCompany(e.target.value)}
                placeholder="公司（点击下方识别按钮填入）"
                aria-label="公司"
                className="soft-input"
              />
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="岗位（可手动修改）"
                aria-label="岗位"
                className="soft-input"
              />
            </div>

            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Link2 className="h-3.5 w-3.5" />
                工作网址 / JD 链接
                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">
                  粘贴即自动提取
                </span>
              </label>
            </div>
            <div className="mb-2 flex gap-2">
              <input
                value={draftJobUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text?.trim()) {
                    e.preventDefault();
                    onUrlChange(text.trim());
                  }
                }}
                placeholder="🔗 粘贴岗位 URL，自动提取 JD 到下方…"
                className="min-w-0 flex-1 soft-input"
              />
              <button
                type="button"
                onClick={handleParseUrl}
                disabled={loadingParse || !canParseUrl}
                className="soft-btn shrink-0 rounded-2xl border border-teal-200/60 bg-teal-50/80 px-3 py-2 text-teal-900 shadow-glass disabled:opacity-50"
              >
                {loadingParse ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                解析
              </button>
            </div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-600">
                JD 描述
                {draftJd.trim() && (
                  <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                    可编辑
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handleRecognizeMeta}
                disabled={loadingParse || !canRecognizeMeta}
                className="soft-btn rounded-xl border border-indigo-200/60 bg-indigo-50/80 px-2 py-1 text-[11px] font-medium text-indigo-800 shadow-glass disabled:opacity-50"
                title="仅点击时调用 API，节省 Token"
              >
                {loadingParse ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
                识别公司与岗位
              </button>
            </div>
            <textarea
              value={draftJd}
              onChange={(e) => onJdChange(e.target.value)}
              placeholder="粘贴完整 JD，或粘贴上方 URL 后自动填充…"
              className="soft-textarea mb-3 h-44 w-full p-3"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            />
            {parseHint && (
              <p
                className={`mb-2 rounded-lg px-2.5 py-2 text-xs leading-relaxed ${
                  /粘贴|完整|Job Description|反爬|无法抓取|预填|URL parsed/i.test(
                    parseHint
                  )
                    ? "bg-amber-50 text-amber-900"
                    : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {parseHint}
              </p>
            )}
            <button
              type="button"
              onClick={rewriteCv}
              disabled={loadingCv || !canRewrite}
              className="soft-btn-primary w-full py-3 font-semibold"
            >
              {loadingCv ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              根据 JD 改写 CV
            </button>
            <p className="mt-2 text-[11px] text-slate-400">
              粘贴 URL 自动提取 JD · 画像 {fullExperience.length} 字
              {cachedParsedJd ? " · 已缓存链接 JD" : ""}
            </p>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={genCover}
              disabled={loadingCover || !canRewrite}
              className="soft-btn-ghost w-full py-3 disabled:opacity-50"
            >
              {loadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              生成 Cover Letter
            </button>
            <button
              type="button"
              onClick={genInterview}
              disabled={loadingInterview || !canRewrite}
              className="soft-btn-ghost w-full py-3 disabled:opacity-50"
            >
              {loadingInterview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              生成面试预测题及答案
            </button>
          </div>

          {coverLetter && (
            <div className="glass-panel p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-slate-800">
                  Cover Letter
                </h4>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={exportCoverPdf}
                    className="soft-btn rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportCoverWord}
                    className="soft-btn rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  >
                    <FileText className="h-3 w-3" />
                    Word
                  </button>
                  <button
                    type="button"
                    onClick={copyCover}
                    className="soft-btn rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  >
                    {copiedKey === "cl" ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy
                  </button>
                </div>
              </div>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {coverLetter}
              </pre>
            </div>
          )}

          {interviewQA && interviewQA.length > 0 && (
            <div className="glass-panel p-4">
              <h4 className="mb-2 text-sm font-medium text-slate-800">
                面试预测题
              </h4>
              <ul className="space-y-3">
                {interviewQA.map((qa, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-slate-200/40 bg-slate-50/80 p-3 text-xs"
                  >
                    <p className="font-medium text-slate-900">{qa.question}</p>
                    {qa.tip && (
                      <p className="mt-1 text-amber-800">💡 {qa.tip}</p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">
                      {qa.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(!isCvRationaleEmpty(rationale) || hasCv) && (
            <div className="rounded-2xl border border-amber-200/50 bg-amber-50/60 p-5 shadow-glass backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setShowRationale((v) => !v)}
                className="mb-3 flex w-full items-center gap-2 text-left"
              >
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="flex-1 text-sm font-semibold tracking-wide text-amber-950">
                  修改逻辑
                </span>
                {showRationale ? (
                  <ChevronUp className="h-4 w-4 text-amber-700" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-700" />
                )}
              </button>
              {showRationale && (
                <div className="space-y-3">
                  <RationaleSection
                    emoji="🟢"
                    title="增加"
                    items={rationale.added}
                    tone="emerald"
                  />
                  <RationaleSection
                    emoji="🔴"
                    title="减少"
                    items={rationale.removed}
                    tone="rose"
                  />
                </div>
              )}
            </div>
          )}

          {hasCv ? (
            <>
              <EditableCvPreview
                key={`cv-${cvEpoch}`}
                initialHtml={resumeHtml || tailoredResume}
                onHtmlChange={(html) => {
                  setResumeHtml(html);
                  setTailoredResume(html);
                }}
                exportRef={exportRef}
                toolbar={
                  <>
                    <button
                      type="button"
                      onClick={exportCvPdf}
                      className="soft-btn rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-900"
                    >
                      <Download className="h-3 w-3" />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={exportCvWord}
                      className="soft-btn rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <FileText className="h-3 w-3" />
                      Download Word
                    </button>
                    <button
                      type="button"
                      onClick={copyCvText}
                      className="soft-btn rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      {copiedKey === "cv" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy
                    </button>
                  </>
                }
              />

              <div className="glass-panel p-5">
                <h4 className="mb-1 text-sm font-semibold text-slate-900">
                  手动添加修改需求
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  基于初稿二次优化：说明你想强调或调整的方向，再点「重新优化
                  CV」。
                </p>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={3}
                  placeholder='例如：强调我的 GIS 数据分析经验；语言更偏向商务风格；弱化与岗位无关的社团经历…'
                  className="soft-textarea mb-3 w-full p-3"
                />
                <button
                  type="button"
                  onClick={refineCv}
                  disabled={loadingRefine || !revisionNotes.trim()}
                  className="soft-btn-accent w-full py-3 font-semibold disabled:opacity-50"
                >
                  {loadingRefine ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  重新优化 CV
                </button>
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300/70 bg-white/50 px-6 text-center text-sm text-slate-400 shadow-glass backdrop-blur-md">
              粘贴岗位网址（自动提取 JD）或手动粘贴 JD，点击「根据 JD 改写
              CV」后，此处显示拉满 A4 的英文简历
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RationaleSection({
  emoji,
  title,
  items,
  tone,
}: {
  emoji: string;
  title: string;
  items: CvRationaleItem[];
  tone: "emerald" | "rose";
}) {
  const tag =
    tone === "emerald"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-800"
      : "border-rose-200/70 bg-rose-50 text-rose-800";
  return (
    <div className="rounded-xl border border-white/50 bg-white/55 p-3 shadow-sm backdrop-blur-sm">
      <span
        className={`mb-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide ${tag}`}
      >
        <span aria-hidden>{emoji}</span>
        {title}
      </span>
      <ul className="space-y-1.5">
        {(items.length ? items : [{ text: "暂无", reason: "" }]).map(
          (item, i) => (
            <li
              key={`${title}-${i}-${item.text.slice(0, 16)}`}
              className="text-sm leading-relaxed text-slate-700"
            >
              • {formatRationaleLine(item)}
            </li>
          )
        )}
      </ul>
    </div>
  );
}
