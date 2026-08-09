"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Download,
  Wand2,
  ArrowLeft,
  Mail,
  Mic,
  Save,
  Link2,
  Search,
  FileText,
  Copy,
  Check,
  RefreshCw,
  MessageSquareText,
  SquareKanban,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { EditableCvPreview } from "@/components/EditableCvPreview";
import { EditableCoverLetter } from "@/components/EditableCoverLetter";
import {
  applyHighlightsToHtml,
  buildHighlights,
  CV_REVIEW_CSS,
  CvReviewLayout,
  stripReviewMarks,
  WordCommentCard,
  type CvHighlight,
} from "@/components/CvReviewLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  CV_FONT_SIZE_OPTIONS,
  CV_LINE_PRESETS,
  CV_TYPOGRAPHY_DEFAULTS,
  DEFAULT_CV_SKILLS,
  buildCvTypographyCss,
  ensureSkillsSection,
  mergeCompanyRoleInline,
  type CvFontSizePt,
  type CvLinePreset,
} from "@/lib/cv-template";
import { normalizeCoverLetterText } from "@/lib/cover-letter";
import {
  exportHtmlPdf,
  exportHtmlWord,
  wrapCoverLetterAsDoc,
} from "@/lib/export";
import { isValidCompanyName, isValidJobTitle } from "@/lib/job-meta";
import {
  EMPTY_CV_RATIONALE,
  isCvRationaleEmpty,
  normalizeCvRationale,
  type JobApplication,
} from "@/types";

const SHORT_JD_HINT =
  "已根据链接预填公司与岗位。如抓取不完整，请在下方 JD 框中补充完整文本后再生成。";

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
    profile,
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
  const [loadingCoverRefine, setLoadingCoverRefine] = useState(false);
  const [coverRevisionNotes, setCoverRevisionNotes] = useState("");
  const [coverRefineStatus, setCoverRefineStatus] = useState("");
  const [coverRevisionRound, setCoverRevisionRound] = useState(0);
  const [coverEpoch, setCoverEpoch] = useState(0);
  const [coverAlignments, setCoverAlignments] = useState<
    {
      instruction: string;
      status: "done" | "partial" | "blocked";
      evidence: string;
      note: string;
    }[]
  >([]);
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
  const [refineStatus, setRefineStatus] = useState("");
  /** Completed generation rounds; refine always uses round = cvRevisionRound + 1 */
  const [cvRevisionRound, setCvRevisionRound] = useState(0);
  const [cvHighlights, setCvHighlights] = useState<CvHighlight[]>([]);
  const [revisionAlignments, setRevisionAlignments] = useState<
    {
      instruction: string;
      status: "done" | "partial" | "blocked";
      evidence: string;
      note: string;
    }[]
  >([]);
  const [cvFontSizePt, setCvFontSizePt] = useState<CvFontSizePt>(
    CV_TYPOGRAPHY_DEFAULTS.fontSizePt
  );
  const [cvLineHeight, setCvLineHeight] = useState<number>(
    CV_TYPOGRAPHY_DEFAULTS.lineHeight
  );
  const exportRef = useRef<HTMLDivElement>(null);
  const refineAbortRef = useRef<AbortController | null>(null);

  const cvLinePreset: CvLinePreset | "custom" =
    Math.abs(cvLineHeight - CV_LINE_PRESETS.tight) < 0.02
      ? "tight"
      : Math.abs(cvLineHeight - CV_LINE_PRESETS.normal) < 0.02
        ? "normal"
        : Math.abs(cvLineHeight - CV_LINE_PRESETS.loose) < 0.02
          ? "loose"
          : "custom";
  const cvTypographyCss = buildCvTypographyCss(cvFontSizePt, cvLineHeight);
  const clearingRef = useRef(false);
  const urlParseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skip path-B exclusivity while auto-filling JD from URL parse */
  const fillingFromUrlRef = useRef(false);

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
    setCoverRevisionNotes("");
    setCoverRefineStatus("");
    setCoverRevisionRound(0);
    setCoverAlignments([]);
    setCoverEpoch((n) => n + 1);
    setInterviewQA([]);
    setRationale({ ...EMPTY_CV_RATIONALE });
    setCvHighlights([]);
    setRevisionAlignments([]);
    setShowRationale(false);
    setCvEpoch((n) => n + 1);
    setCvRevisionRound(0);
    setRevisionNotes("");
    setRefineStatus("");
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
      const fixed = ensureSkillsSection(tailoredResume, {
        software: profile.skillsSoftware,
        language: profile.skillsLanguage,
        certificate: profile.skillsCertificate,
      });
      setResumeHtml(fixed);
      setTailoredResume(stripReviewMarks(fixed));
      setCvEpoch((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailoredResume]);

  function skillsOverrides() {
    return {
      software: profile.skillsSoftware?.trim() || DEFAULT_CV_SKILLS.software,
      language: profile.skillsLanguage?.trim() || DEFAULT_CV_SKILLS.language,
      certificate:
        profile.skillsCertificate?.trim() || DEFAULT_CV_SKILLS.certificate,
    };
  }

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

  /**
   * 路径 A：粘贴 Job URL → 先清空 JD，解析成功后把完整 JD 填回文本框（可编辑）
   */
  function onUrlChange(value: string) {
    setDraftJobUrl(value);
    const trimmed = value.trim();
    if (urlParseTimerRef.current) clearTimeout(urlParseTimerRef.current);

    if (!trimmed) {
      setCachedParsedJd("");
      return;
    }

    // 解析前互斥清空；成功后再回填 JD
    setDraftJd("");
    setCachedParsedJd("");

    if (!looksLikeUrl(trimmed)) return;
    urlParseTimerRef.current = setTimeout(() => {
      void autoExtractJdFromUrl(trimmed);
    }, 500);
  }

  /**
   * 路径 B：手动输入/修改 JD → 清空上方链接（自动回填时跳过）
   */
  function onJdChange(value: string) {
    setDraftJd(value);
    if (fillingFromUrlRef.current) return;
    if (value.trim()) {
      setDraftJobUrl("");
      setCachedParsedJd("");
      if (urlParseTimerRef.current) clearTimeout(urlParseTimerRef.current);
    }
  }

  function fillJdFromUrlParse(jd: string) {
    fillingFromUrlRef.current = true;
    setCachedParsedJd(jd);
    setDraftJd(jd);
    // Allow React to process setState before re-enabling exclusivity
    queueMicrotask(() => {
      fillingFromUrlRef.current = false;
    });
  }

  async function autoExtractJdFromUrl(rawUrl: string) {
    const url = normalizeUrl(rawUrl);
    if (!url || !looksLikeUrl(url)) return;
    beginNewJobParse();
    setDraftJd("");
    setLoadingParse(true);
    setError("");
    setParseHint("路径 A：正在从链接提取岗位信息…");
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
      fillJdFromUrlParse(jd);

      if (jd && meaningfulTextLen(jd) >= 40) {
        setParseHint(
          softFallback
            ? hint || SHORT_JD_HINT
            : `路径 A 已解析：${company || "公司未识别"} · ${title || "岗位未识别"}（完整 JD 已填入下方，可编辑）`
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

    // Cache scraped JD; URL path also fills the textarea via caller
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
    // 路径 B：仅文本、无链接
    if (meaningfulTextLen(draftJd) >= 50 && !draftJobUrl.trim()) {
      return {
        jd: draftJd.trim(),
        company: draftCompany,
        title: draftTitle,
        applyUrl: undefined,
      };
    }

    // 路径 A：有链接 — 优先用文本框（解析回填或用户已编辑），其次缓存
    if (draftJobUrl.trim()) {
      const fromBox =
        meaningfulTextLen(draftJd) >= 50 ? draftJd.trim() : "";
      const fromCache =
        meaningfulTextLen(cachedParsedJd) >= 50 ? cachedParsedJd.trim() : "";
      if (fromBox || fromCache) {
        return {
          jd: fromBox || fromCache,
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
      fillJdFromUrlParse(resolved.jd);
      return {
        ...resolved,
        applyUrl: normalizeUrl(draftJobUrl.trim()),
      };
    }

    if (draftJd.trim()) {
      return {
        jd: draftJd.trim(),
        company: draftCompany,
        title: draftTitle,
        applyUrl: undefined,
      };
    }

    throw new Error("请选择路径 A（粘贴链接）或路径 B（粘贴 JD 文本）");
  }

  async function applyCvResult(data: {
    tailoredResumeHtml?: string;
    rationale?: unknown;
    rationaleList?: unknown;
    highlights?: Partial<CvHighlight>[];
    revisionRound?: number;
    revisionAlignments?: {
      instruction: string;
      status: "done" | "partial" | "blocked";
      evidence: string;
      note: string;
    }[];
  }) {
    const rationaleNext = normalizeCvRationale(
      data.rationale ?? data.rationaleList
    );
    const rawHtml = mergeCompanyRoleInline(
      ensureSkillsSection(
        String(data.tailoredResumeHtml || "").trim(),
        skillsOverrides()
      )
    );
    if (!rawHtml) {
      throw new Error("未返回有效 CV HTML");
    }
    const highlights = buildHighlights(
      rawHtml,
      rationaleNext,
      data.highlights
    );
    const { html: highlighted, applied } = applyHighlightsToHtml(
      rawHtml,
      highlights
    );
    setCvHighlights(applied);
    setResumeHtml(highlighted);
    // Clean baseline for next incremental round (no marks)
    setTailoredResume(stripReviewMarks(rawHtml));
    setRationale(rationaleNext);
    if (Array.isArray(data.revisionAlignments)) {
      setRevisionAlignments(data.revisionAlignments);
    } else {
      setRevisionAlignments([]);
    }
    if (typeof data.revisionRound === "number" && data.revisionRound > 0) {
      setCvRevisionRound(data.revisionRound);
    }
    bindGenerationSource();
    setShowRationale(true);
    setCvEpoch((n) => n + 1);
  }

  /** Prefer live editor (user edits) → clean tailoredResume → highlighted resumeHtml */
  function latestCleanCvHtml(): string {
    const live = exportRef.current?.innerHTML?.trim() || "";
    const candidate =
      live.includes("cv-sheet")
        ? live
        : tailoredResume?.includes("cv-sheet")
          ? tailoredResume
          : resumeHtml || tailoredResume || "";
    return stripReviewMarks(candidate).trim();
  }

  async function fetchGenerateResume(
    body: Record<string, unknown>,
    opts?: { signal?: AbortSignal; retries?: number }
  ) {
    const retries = opts?.retries ?? 1;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          setRefineStatus(`请求超时，正在重试（${attempt}/${retries}）…`);
        }
        const res = await fetch("/api/generate-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: opts?.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = String(data.error || "生成失败");
          // Retry on gateway timeout
          if (
            (res.status === 504 || /超时|timeout/i.test(msg)) &&
            attempt < retries
          ) {
            lastErr = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }
        return data;
      } catch (e) {
        lastErr = e;
        if (opts?.signal?.aborted) throw e;
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || /aborted|timeout/i.test(e.message));
        if (isAbort && attempt < retries) continue;
        if (attempt >= retries) throw e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("生成失败");
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
    setRefineStatus("");
    try {
      const resolved = await resolveJd();
      const data = await fetchGenerateResume(
        { jd: resolved.jd, resume: fullExperience, revisionRound: 1 },
        { retries: 1 }
      );
      await applyCvResult({ ...data, revisionRound: 1 });
      setRevisionNotes("");
      setCvRevisionRound(1);
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

    refineAbortRef.current?.abort();
    const controller = new AbortController();
    refineAbortRef.current = controller;
    // Client-side hard timeout (slightly above server DeepSeek timeout)
    const timeoutId = setTimeout(() => controller.abort(), 160_000);

    const nextRound = Math.max(2, cvRevisionRound + 1);
    setLoadingRefine(true);
    setError("");
    setRefineStatus(`第 ${nextRound} 轮优化中，请稍候…`);

    try {
      const resolved = await resolveJd();
      const current = latestCleanCvHtml();
      if (!current.includes("cv-sheet") && current.length < 80) {
        throw new Error("无法读取上一版 CV，请先重新生成初稿");
      }

      const data = await fetchGenerateResume(
        {
          jd: resolved.jd,
          resume: fullExperience,
          currentCvHtml: current,
          revisionNotes: revisionNotes.trim(),
          revisionRound: nextRound,
        },
        { signal: controller.signal, retries: 1 }
      );
      await applyCvResult({
        ...data,
        revisionRound: Number(data.revisionRound) || nextRound,
      });
      setRevisionNotes("");
      setRefineStatus(`第 ${nextRound} 轮已完成，可继续叠加修改`);
    } catch (e) {
      if (controller.signal.aborted) {
        setError("请求超时或已取消，请重试（将基于当前最新 CV 继续）");
      } else {
        setError(e instanceof Error ? e.message : "重新优化失败");
      }
      setRefineStatus("");
    } finally {
      clearTimeout(timeoutId);
      setLoadingRefine(false);
      if (refineAbortRef.current === controller) {
        refineAbortRef.current = null;
      }
    }
  }

  async function genCover() {
    if (!canRewrite) {
      setError("需要岗位 JD（或网址）与人物画像全量经历");
      return;
    }
    setLoadingCover(true);
    setError("");
    setCoverRefineStatus("");
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
          revisionRound: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setCoverLetter(
        normalizeCoverLetterText(String(data.coverLetter || ""))
      );
      setCoverRevisionRound(1);
      setCoverAlignments([]);
      setCoverRevisionNotes("");
      setCoverEpoch((n) => n + 1);
      bindGenerationSource();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover Letter 生成失败");
    } finally {
      setLoadingCover(false);
    }
  }

  async function refineCover() {
    if (!coverLetter.trim()) {
      setError("请先生成 Cover Letter");
      return;
    }
    if (!coverRevisionNotes.trim()) {
      setError("请填写 Cover Letter 修改建议");
      return;
    }
    if (!fullExperience.trim()) {
      setError("请先在「人物画像」填写结构化经历");
      return;
    }
    const nextRound = Math.max(2, coverRevisionRound + 1);
    setLoadingCoverRefine(true);
    setError("");
    setCoverRefineStatus(`第 ${nextRound} 轮优化中…`);
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
          currentCoverLetter: normalizeCoverLetterText(coverLetter),
          revisionNotes: coverRevisionNotes.trim(),
          revisionRound: nextRound,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重新优化失败");
      setCoverLetter(
        normalizeCoverLetterText(String(data.coverLetter || ""))
      );
      setCoverRevisionRound(Number(data.revisionRound) || nextRound);
      setCoverAlignments(
        Array.isArray(data.revisionAlignments) ? data.revisionAlignments : []
      );
      setCoverRevisionNotes("");
      setCoverEpoch((n) => n + 1);
      setCoverRefineStatus(`第 ${nextRound} 轮已完成，可继续叠加修改`);
      bindGenerationSource();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover Letter 重新优化失败");
      setCoverRefineStatus("");
    } finally {
      setLoadingCoverRefine(false);
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

  function resolveTrackerPayload(): {
    company: string;
    title: string;
    jdText: string;
    jobUrl: string;
  } {
    const jdText = (draftJd.trim() || cachedParsedJd.trim()).trim();
    const jobUrl = draftJobUrl.trim()
      ? normalizeUrl(draftJobUrl.trim())
      : "";
    return {
      company: draftCompany.trim() || "未命名公司",
      title: draftTitle.trim() || "未命名岗位",
      jdText,
      jobUrl,
    };
  }

  /** 仅凭公司/岗位/JD/链接即可导入看板（无需已生成 CV） */
  function importJobToTracker() {
    const { company, title, jdText, jobUrl } = resolveTrackerPayload();
    if (
      company === "未命名公司" &&
      title === "未命名岗位" &&
      !jdText &&
      !jobUrl
    ) {
      setError("请先填写公司或岗位名称，或粘贴 JD / 岗位链接后再导入");
      return;
    }
    const now = new Date().toISOString();
    const app: Omit<JobApplication, "id"> = {
      company,
      title,
      jd: jdText,
      jdText,
      applyUrl: jobUrl || undefined,
      jobUrl: jobUrl || undefined,
      trackStatus: "preparing",
      createdAt: now,
      updatedAt: now,
    };
    const result = appendApplication(app);
    setError("");
    setSavedHint(
      result.updated
        ? `已更新求职进度：${app.company} · ${app.title}`
        : `已导入求职进度：${app.company} · ${app.title}`
    );
    setTimeout(() => setSavedHint(""), 2500);
  }

  function saveToTracker() {
    const liveHtml =
      exportRef.current?.innerHTML?.trim() ||
      resumeHtml ||
      tailoredResume ||
      "";
    if (!liveHtml && !coverLetter && !(interviewQA && interviewQA.length)) {
      setError("暂无材料可保存，请先生成 CV / Cover Letter / 面试题；或使用「导入求职进度」仅归档岗位");
      return;
    }
    const { company, title, jdText, jobUrl } = resolveTrackerPayload();
    const now = new Date().toISOString();
    const app: Omit<JobApplication, "id"> = {
      company,
      title,
      jd: jdText,
      jdText,
      applyUrl: jobUrl || undefined,
      jobUrl: jobUrl || undefined,
      cvHtml: liveHtml ? stripReviewMarks(liveHtml) : undefined,
      coverLetter: coverLetter || undefined,
      rationale: isCvRationaleEmpty(rationale) ? undefined : rationale,
      interviewQA: interviewQA?.length ? interviewQA : undefined,
      trackStatus: "preparing",
      createdAt: now,
      updatedAt: now,
    };
    const result = appendApplication(app);
    setError("");
    setSavedHint(
      result.updated
        ? `已覆盖更新求职进度：${app.company} · ${app.title}`
        : `已保存到求职进度：${app.company} · ${app.title}`
    );
    setTimeout(() => setSavedHint(""), 2500);
  }

  function liveCvHtml() {
    const raw =
      exportRef.current?.innerHTML?.trim() ||
      resumeHtml.trim() ||
      tailoredResume ||
      "";
    return mergeCompanyRoleInline(stripReviewMarks(raw));
  }

  function exportCvPdf() {
    const html = liveCvHtml();
    if (!html) {
      setError("暂无 CV 可导出");
      return;
    }
    if (
      !exportHtmlPdf(html, "CV", {
        fontSizePt: cvFontSizePt,
        lineHeight: cvLineHeight,
      })
    ) {
      setError("浏览器拦截了弹窗");
    }
  }

  function exportCvWord() {
    const html = liveCvHtml();
    if (!html) {
      setError("暂无 CV 可导出");
      return;
    }
    exportHtmlWord(
      html,
      `${draftCompany || "CV"}-${draftTitle || "Resume"}.doc`,
      { fontSizePt: cvFontSizePt, lineHeight: cvLineHeight }
    );
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

  const inputPath: "url" | "jd" | null = draftJobUrl.trim()
    ? "url"
    : draftJd.trim()
      ? "jd"
      : null;

  function exportCoverPdf() {
    if (!coverLetter) return;
    exportHtmlPdf(wrapCoverLetterAsDoc(coverLetter), "Cover Letter");
  }

  function exportCoverWord() {
    if (!coverLetter) return;
    exportHtmlWord(
      wrapCoverLetterAsDoc(coverLetter),
      `${draftCompany || "CoverLetter"}.doc`
    );
  }

  async function copyCover() {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(
      normalizeCoverLetterText(coverLetter)
    );
    setCopiedKey("cl");
    setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <PageHeader
        emoji="📝"
        step="步骤 2 · 专属简历"
        title="一键改写 CV · 按需生成其他材料"
        description="左侧 JD · 中间整页 A4 预览 · 右侧批注（比例 2:3:1）。实习每段 2 条要点，严格单页。"
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
              onClick={importJobToTracker}
              className="soft-btn rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-2.5 text-amber-950 shadow-glass backdrop-blur-md hover:bg-amber-50"
            >
              <SquareKanban className="h-4 w-4" />
              导入求职进度
            </button>
            <button
              type="button"
              onClick={saveToTracker}
              className="soft-btn rounded-2xl border border-teal-200/60 bg-teal-50/80 px-4 py-2.5 text-teal-900 shadow-glass backdrop-blur-md hover:bg-teal-50"
            >
              <Save className="h-4 w-4" />
              保存 CV 到求职进度
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

      <div className="grid gap-4 xl:grid-cols-[2fr_4fr]">
        <div className="min-w-0 space-y-4">
          <div className="glass-panel p-4">
            <h3 className="mb-3 font-display text-lg text-slate-900">
              目标岗位
            </h3>
            <div className="mb-3 grid gap-2">
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
                路径 A · 工作网址 / JD 链接
                {inputPath === "url" && (
                  <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">
                    当前路径
                  </span>
                )}
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
                placeholder="🔗 粘贴 URL（解析后将完整 JD 填入下方，可编辑）"
                className="min-w-0 flex-1 soft-input"
              />
              <button
                type="button"
                onClick={handleParseUrl}
                disabled={loadingParse || !canParseUrl}
                className="soft-btn shrink-0 rounded-2xl border border-teal-200/60 bg-teal-50/80 px-3 py-2 text-teal-900 shadow-glass disabled:opacity-50"
              >
                {loadingParse && inputPath === "url" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                解析
              </button>
            </div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-600">
                路径 B · JD 描述
                {inputPath === "jd" && (
                  <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                    当前路径
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
              placeholder="粘贴完整 JD，或由上方链接解析自动填入（手动编辑将清空链接）…"
              className="soft-textarea mb-3 h-36 w-full p-2.5 text-xs"
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
              onClick={importJobToTracker}
              className="soft-btn mb-2 w-full rounded-2xl border border-amber-200/70 bg-amber-50/90 py-2.5 text-sm font-medium text-amber-950 shadow-glass"
            >
              <SquareKanban className="h-4 w-4" />
              导入求职进度
            </button>
            <p className="mb-3 text-[10px] leading-relaxed text-slate-400">
              无需生成 CV：只要有公司 / 岗位 / JD / 链接即可归档到看板
            </p>
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
              链接解析后自动填入 JD · 画像 {fullExperience.length} 字
              {inputPath === "url" && (draftJd.trim() || cachedParsedJd)
                ? " · 路径 A（链接 + JD）"
                : ""}
              {inputPath === "jd" ? " · 路径 B 文本分析" : ""}
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
                <div>
                  <h4 className="text-sm font-medium text-slate-800">
                    Cover Letter
                  </h4>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    点击正文直接编辑 · 第 {Math.max(1, coverRevisionRound)} 轮
                  </p>
                </div>
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

              <EditableCoverLetter
                value={coverLetter}
                contentKey={coverEpoch}
                disabled={loadingCover || loadingCoverRefine}
                onChange={(text) =>
                  setCoverLetter(normalizeCoverLetterText(text))
                }
              />

              {coverAlignments.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-3">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-600">
                    指令对齐（本轮修改）
                  </p>
                  {coverAlignments.map((a, i) => (
                    <div
                      key={`${a.instruction}-${i}`}
                      className="rounded-lg border border-slate-200/50 bg-white/70 px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-800">
                          {i + 1}. {a.instruction}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            a.status === "done"
                              ? "bg-emerald-50 text-emerald-700"
                              : a.status === "partial"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {a.status === "done"
                            ? "已落地"
                            : a.status === "partial"
                              ? "部分"
                              : "受阻"}
                        </span>
                      </div>
                      {a.note && (
                        <p className="mt-0.5 text-slate-500">{a.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 border-t border-slate-200/60 pt-3">
                <h5 className="mb-1 text-xs font-semibold text-slate-800">
                  根据建议迭代修改
                </h5>
                <p className="mb-2 text-[10px] text-slate-500">
                  多条建议请换行或用分号分隔；将基于当前正文增量改写
                </p>
                <textarea
                  value={coverRevisionNotes}
                  onChange={(e) => setCoverRevisionNotes(e.target.value)}
                  rows={2}
                  disabled={loadingCoverRefine}
                  placeholder="例如：更强调 ESG 数据分析；缩短结尾；语气更正式…"
                  className="soft-textarea mb-2 w-full p-2 text-xs disabled:opacity-60"
                />
                {coverRefineStatus && (
                  <p className="mb-2 text-[11px] text-emerald-700">
                    {coverRefineStatus}
                  </p>
                )}
                <button
                  type="button"
                  onClick={refineCover}
                  disabled={
                    loadingCoverRefine || !coverRevisionNotes.trim()
                  }
                  className="soft-btn-accent w-full py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {loadingCoverRefine ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {loadingCoverRefine
                    ? `第 ${Math.max(2, coverRevisionRound + 1)} 轮优化中…`
                    : "重新优化 Cover Letter"}
                </button>
              </div>
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

        <div className="min-h-0 min-w-0 space-y-3">
          {hasCv ? (
            <>
              <div className="glass-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-slate-700">排版</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">字号</span>
                  {CV_FONT_SIZE_OPTIONS.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setCvFontSizePt(pt)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        cvFontSizePt === pt
                          ? "bg-teal-600 text-white"
                          : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pt}pt
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">行距</span>
                  {(
                    [
                      ["tight", "Tight"],
                      ["normal", "Normal"],
                      ["loose", "Loose"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCvLineHeight(CV_LINE_PRESETS[key])}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        cvLinePreset === key
                          ? "bg-teal-600 text-white"
                          : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <label className="ml-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>{cvLineHeight.toFixed(2)}</span>
                    <input
                      type="range"
                      min={1.1}
                      max={1.5}
                      step={0.01}
                      value={cvLineHeight}
                      onChange={(e) =>
                        setCvLineHeight(Number(e.target.value))
                      }
                      className="h-1 w-24 accent-teal-600"
                      aria-label="行距微调"
                    />
                  </label>
                </div>
              </div>
            <CvReviewLayout
              highlights={cvHighlights}
              cv={
                <EditableCvPreview
                  key={`cv-${cvEpoch}`}
                  contentKey={cvEpoch}
                  initialHtml={resumeHtml || tailoredResume}
                  onHtmlChange={(html) => {
                    setResumeHtml(html);
                    setTailoredResume(stripReviewMarks(html));
                  }}
                  exportRef={exportRef}
                  extraCss={CV_REVIEW_CSS}
                  typographyCss={cvTypographyCss}
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
              }
              comments={
                <aside className="flex max-h-[calc(100vh-7.5rem)] min-h-0 flex-col gap-2.5 overflow-y-auto pr-0.5">
                  <div className="shrink-0 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquareText className="h-3.5 w-3.5 text-slate-500" />
                      <p className="text-[11px] font-semibold tracking-wide text-slate-700">
                        修订批注
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                      虚线连接左侧高亮与右侧说明
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {cvHighlights.map((h) => (
                      <WordCommentCard key={h.id} highlight={h} />
                    ))}
                    {cvHighlights.length === 0 && (
                      <p className="px-2 py-6 text-center text-[11px] text-slate-400">
                        生成 CV 后将在此显示批注
                      </p>
                    )}
                    {revisionAlignments.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3">
                        <p className="px-0.5 text-[10px] font-semibold tracking-wide text-slate-600">
                          指令对齐（本轮修改）
                        </p>
                        {revisionAlignments.map((a, i) => (
                          <div
                            key={`${a.instruction}-${i}`}
                            className="rounded-xl border border-slate-200/60 bg-white/70 px-2.5 py-2 text-[11px]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-800">
                                {i + 1}. {a.instruction}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                  a.status === "done"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : a.status === "partial"
                                      ? "bg-amber-50 text-amber-800"
                                      : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {a.status === "done"
                                  ? "已落地"
                                  : a.status === "partial"
                                    ? "部分"
                                    : "受阻"}
                              </span>
                            </div>
                            {a.note && (
                              <p className="mt-1 text-slate-500">{a.note}</p>
                            )}
                            {a.evidence && (
                              <p className="mt-1 line-clamp-2 text-[10px] text-teal-800/80">
                                “{a.evidence}”
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel shrink-0 p-4">
                    <h4 className="mb-1 text-sm font-semibold text-slate-900">
                      手动添加修改需求
                    </h4>
                    <p className="mb-2 text-[11px] text-slate-500">
                      基于第 {Math.max(1, cvRevisionRound)} 轮结果继续叠加修改；多条指令请换行或用分号分隔
                    </p>
                    <textarea
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      rows={3}
                      disabled={loadingRefine}
                      placeholder="例如：强调 GIS 数据分析；语言更偏商务…"
                      className="soft-textarea mb-2 w-full p-2.5 text-xs disabled:opacity-60"
                    />
                    {refineStatus && (
                      <p className="mb-2 text-[11px] text-emerald-700">
                        {refineStatus}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={refineCv}
                      disabled={loadingRefine || !revisionNotes.trim()}
                      className="soft-btn-accent w-full py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      {loadingRefine ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {loadingRefine
                        ? `第 ${Math.max(2, cvRevisionRound + 1)} 轮优化中…`
                        : "重新优化 CV"}
                    </button>
                  </div>
                </aside>
              }
            />
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300/70 bg-white/50 px-6 text-center text-sm text-slate-400 shadow-glass backdrop-blur-md">
              选择路径 A（链接）或路径 B（JD 文本），点击「根据 JD 改写
              CV」后，此处以 Word 批注模式展示简历与修改建议
            </div>
          )}
        </div>
      </div>
    </section>
  );
}



