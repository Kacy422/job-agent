import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { scrapeJobPage } from "@/lib/scrape";
import { extractJobFromPage } from "@/lib/extract-job";
import { scoreJdAgainstResume } from "@/lib/score";
import { getDeepSeekKey } from "@/lib/deepseek";
import { pipelineToLegacyStatus, type Job } from "@/types";

export const maxDuration = 60;

const SHORT_JD_HINT =
  "已根据链接自动填充目标岗位。如需更精细的匹配，建议直接将网页上的完整 Job Description 粘贴至下方框内";

function meaningfulLen(text: string) {
  return text.replace(/\s+/g, "").length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = String(body.url || "").trim();
    const resume = String(body.resume || "").trim();
    const manualJd = String(body.manualJd || body.jd || "").trim();
    const applyUrl = String(body.applyUrl || "").trim();

    if (!url && !manualJd) {
      return NextResponse.json(
        { error: "请提供岗位网页链接，或手动粘贴 JD" },
        { status: 400 }
      );
    }

    let pageTitle = "";
    let pageText = manualJd;
    let finalUrl = url || "manual://paste";
    let softFallback = false;
    let scrapeHint = "";
    let scrapedRawLen = manualJd ? meaningfulLen(manualJd) : 0;

    if (url && !manualJd) {
      try {
        const scraped = await scrapeJobPage(url);
        pageTitle = scraped.title;
        pageText = scraped.text;
        finalUrl = scraped.url;
        scrapedRawLen = meaningfulLen(scraped.text);
        softFallback = Boolean(scraped.softFallback);

        // JD 过短（反爬 / 空壳页）：按软降级处理，仍提取公司与岗位
        if (!softFallback && scrapedRawLen < 50) {
          softFallback = true;
          scrapeHint = SHORT_JD_HINT;
        } else if (softFallback) {
          scrapeHint = scraped.hint || SHORT_JD_HINT;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "抓取失败";
        if (/无效的 URL|仅支持/.test(message)) {
          return NextResponse.json({ error: message }, { status: 400 });
        }
        softFallback = true;
        scrapeHint = SHORT_JD_HINT;
        pageTitle = "";
        pageText = `Job URL: ${url}\n\nNOTE: scrape failed. Please paste JD manually.`;
        finalUrl = url;
        scrapedRawLen = 0;
      }
    } else if (url && manualJd) {
      // 同时有 URL + 粘贴正文：以正文为主，URL 辅助
      pageTitle = String(body.title || "");
      pageText = manualJd;
      finalUrl = url;
      scrapedRawLen = meaningfulLen(manualJd);
    } else if (manualJd) {
      pageTitle = String(body.title || "手动粘贴岗位");
      pageText = manualJd;
      scrapedRawLen = meaningfulLen(manualJd);
    }

    const extracted = await extractJobFromPage(pageTitle, pageText, finalUrl);
    const score = await scoreJdAgainstResume(
      extracted.description,
      resume,
      extracted.title
    );

    const now = new Date().toISOString();
    let source = "手动粘贴";
    if (url && finalUrl.startsWith("http")) {
      try {
        source = softFallback
          ? "URL 推断"
          : new URL(finalUrl).hostname.replace(/^www\./, "");
      } catch {
        source = softFallback ? "URL 推断" : "网页抓取";
      }
    }

    // 软降级 / 过短：不把占位 NOTE 当完整 JD 写回前端
    const description =
      softFallback || scrapedRawLen < 50 ? "" : extracted.description;

    const job: Job = {
      id: randomUUID(),
      url: finalUrl,
      applyUrl: applyUrl || extracted.applyUrl || finalUrl,
      title: extracted.title,
      company: extracted.company,
      location: extracted.location,
      salary: extracted.salary,
      source,
      tags: extracted.keywords.slice(0, 6),
      description,
      keywords: score.keywords?.length ? score.keywords : extracted.keywords,
      matchScore: score.score,
      matchGaps: score.gaps,
      matchStrengths: score.strengths,
      matchSummary: score.summary,
      pipelineStatus: "matched",
      status: pipelineToLegacyStatus("matched"),
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({
      job,
      softFallback,
      shortJd: scrapedRawLen < 50,
      hint:
        scrapeHint ||
        (softFallback || scrapedRawLen < 50 ? SHORT_JD_HINT : undefined),
      demo: !getDeepSeekKey(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "解析失败";
    console.error("[parse-job]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
