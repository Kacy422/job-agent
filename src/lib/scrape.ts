import * as cheerio from "cheerio";
import { sanitizeJobMeta } from "@/lib/job-meta";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 模拟真实 Chrome 导航请求头，降低 403 概率 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  htmlLength: number;
  /** 抓取被拦（403 等）时的软降级：仅从 URL 推断 */
  softFallback?: boolean;
  hint?: string;
}

/** 抓取岗位页并抽取可读文本；403/反爬时软降级解析 URL，不抛致命错误 */
export async function scrapeJobPage(url: string): Promise<ScrapedPage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("无效的 URL，请检查链接格式");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("仅支持 http/https 链接");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        ...BROWSER_HEADERS,
        Referer: `${parsed.protocol}//${parsed.host}/`,
      },
      redirect: "follow",
    });

    if (res.status === 403 || res.status === 401 || res.status === 429) {
      return buildUrlSoftFallback(
        url,
        `页面返回 HTTP ${res.status}（反爬拦截）。已根据链接路径预填公司/岗位，请手动粘贴完整 JD 文本以继续改写。`
      );
    }

    if (!res.ok) {
      return buildUrlSoftFallback(
        url,
        `页面抓取失败：HTTP ${res.status}。已根据链接路径预填信息，请直接粘贴 JD 文本。`
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, svg, iframe, nav, footer, header").remove();

    const pageTitle =
      $("meta[property='og:title']").attr("content") ||
      $("title").first().text().trim() ||
      $("h1").first().text().trim() ||
      "";

    const root =
      $("main").length
        ? $("main").first()
        : $("[role='main']").length
          ? $("[role='main']").first()
          : $("article").length
            ? $("article").first()
            : $("#job-description, .job-description, .jobDescription, .jd-content")
                  .length
              ? $(
                  "#job-description, .job-description, .jobDescription, .jd-content"
                ).first()
              : $("body");

    root.find("br").replaceWith("\n");
    root
      .find("p, div, li, tr, h1, h2, h3, h4, h5, h6, section, article")
      .each((_, el) => {
        const node = $(el);
        node.append("\n");
        node.prepend("\n");
      });

    const text = normalizeReadableText(root.text()).slice(0, 28000);

    if (text.replace(/\s/g, "").length < 80) {
      return buildUrlSoftFallback(
        url,
        "页面正文过短或被反爬拦截。已根据链接路径预填公司/岗位，请手动粘贴完整 JD。"
      );
    }

    return {
      url: res.url || url,
      title: collapseInline(pageTitle),
      text,
      htmlLength: html.length,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return buildUrlSoftFallback(
        url,
        "抓取超时。已根据链接路径预填信息，请直接粘贴 JD 文本后继续。"
      );
    }
    // 网络/CORS/其它异常：软降级，避免前端弹致命错误
    return buildUrlSoftFallback(
      url,
      "网页抓取失败。已根据链接路径预填公司/岗位，请手动粘贴 JD 文本。"
    );
  } finally {
    clearTimeout(timer);
  }
}

/** 从 URL host + path 推断公司/岗位线索（403 软降级） */
export function parseHintsFromUrl(url: string): {
  company: string;
  title: string;
  hostBrand: string;
  pathTokens: string[];
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      company: "未知公司",
      title: "未识别岗位",
      hostBrand: "",
      pathTokens: [],
    };
  }

  const host = parsed.hostname.replace(/^www\./i, "");
  const hostBrand = host.split(".")[0] || host;

  const junk = new Set([
    "jobs",
    "job",
    "careers",
    "career",
    "en",
    "zh",
    "cn",
    "hk",
    "www",
    "pages",
    "page",
    "apply",
    "application",
    "position",
    "positions",
    "vacancy",
    "vacancies",
    "opportunity",
    "opportunities",
    "detail",
    "details",
    "posting",
    "postings",
    "search",
    "list",
    "view",
    "id",
    "ref",
  ]);

  const pathTokens = parsed.pathname
    .split("/")
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .map((s) => s.replace(/\+/g, " ").trim())
    .filter(Boolean)
    .filter((s) => !/^\d+$/.test(s))
    .filter((s) => !junk.has(s.toLowerCase()))
    .map((s) => s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1);

  const roleish = [...pathTokens]
    .reverse()
    .find((t) =>
      /intern|analyst|manager|associate|officer|specialist|engineer|designer|esg|sustainab|climate|assistant|coordinator|consultant/i.test(
        t
      )
    );

  const brandFromPath = pathTokens.find((t) =>
    /qeelin|kering|lvmh|hermes|chanel|gucci|cartier|dior|prada|nike|apple|google|microsoft|hsbc|jpmorgan|goldman|mckinsey|deloitte|pwc|ey|kpmg/i.test(
      t
    )
  );

  let title = humanizeToken(roleish || pathTokens[pathTokens.length - 1] || "");
  let company = brandFromPath
    ? titleCaseToken(brandFromPath)
    : titleCaseToken(hostBrand);

  // 若 title 仍含品牌前缀，剥离到岗位侧
  if (brandFromPath && title) {
    const re = new RegExp(`^${escapeReg(brandFromPath)}\\s+`, "i");
    title = title.replace(re, "").trim() || title;
  }
  if (
    company &&
    title &&
    title.toLowerCase().startsWith(company.toLowerCase() + " ")
  ) {
    title = title.slice(company.length).trim();
  }

  // Qeelin 常见在 Kering 集团下：host 含 kering 且 path 有 qeelin
  if (/kering/i.test(host) && brandFromPath && /qeelin/i.test(brandFromPath)) {
    company = "Kering / Qeelin";
  } else if (/kering/i.test(host) && /qeelin/i.test(pathTokens.join(" "))) {
    company = "Kering / Qeelin";
  }

  if (!title) title = "未识别岗位";
  if (!company) company = "未知公司";

  return { company, title, hostBrand, pathTokens };
}

function buildUrlSoftFallback(url: string, hint: string): ScrapedPage {
  const hints = parseHintsFromUrl(url);
  const text = [
    `Job URL: ${url}`,
    `Company (inferred from URL): ${hints.company}`,
    `Job Title (inferred from URL): ${hints.title}`,
    `Host: ${hints.hostBrand}`,
    `Path tokens: ${hints.pathTokens.join(" | ") || "(none)"}`,
    "",
    "NOTE: Full JD text was not available because the page blocked scraping.",
    "Please paste the complete job description manually.",
  ].join("\n");

  return {
    url,
    title: hints.title,
    text,
    htmlLength: 0,
    softFallback: true,
    hint,
  };
}

function humanizeToken(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^(ESG|HK|UK|US|AI|IT|HR|PR|UX|UI|CFA|GRI|ISSB|TCFD)$/i.test(w)) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function titleCaseToken(s: string) {
  if (!s) return s;
  if (/^(qeelin|kering)$/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  return humanizeToken(s);
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 保留换行与分段，仅压缩行内空白与过多空行 */
function normalizeReadableText(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collapseInline(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** 无 API 时的启发式解析；严格分离 company 与 title */
export function heuristicParse(
  pageTitle: string,
  text: string,
  pageUrl = ""
) {
  const urlHints = pageUrl ? parseHintsFromUrl(pageUrl) : null;

  const firstLine =
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 3 && !/^Job URL:/i.test(l)) || "";

  let title =
    pageTitle.split(/[|\-–—]/)[0]?.trim() ||
    firstLine.slice(0, 100) ||
    urlHints?.title ||
    "未识别岗位";

  const companyMatch =
    text.match(
      /(?:公司|Company|雇主|Employer|Brand|集团)[:：\s]+([^\n,，|]{2,60})/i
    ) || pageTitle.match(/\|\s*([^|]+)$/);

  let company = (
    companyMatch?.[1] ||
    urlHints?.company ||
    "未知公司"
  ).trim();

  // 从 title 中剥离公司/品牌前缀，避免 Company 与 Title 重叠
  const brandTokens = [
    company,
    ...(urlHints?.pathTokens || []),
    urlHints?.hostBrand || "",
  ]
    .filter(Boolean)
    .flatMap((c) => c.split(/\s*\/\s*/));

  for (const brand of brandTokens) {
    const b = brand.trim();
    if (b.length < 2) continue;
    const re = new RegExp(`^${escapeReg(b)}(?:\\s*[-–—:/|]\\s*|\\s+)`, "i");
    if (re.test(title)) {
      title = title.replace(re, "").trim();
      if (!companyMatch?.[1] && !/未知/.test(company)) {
        // keep inferred company
      } else if (!companyMatch?.[1] && urlHints) {
        company = urlHints.company;
      }
    }
  }

  // 常见模式："QEELIN ESG and Sustainability Intern" → title 去掉 QEELIN
  title = title
    .replace(/^(QEELIN|Kering)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/kering/i.test(pageUrl) && /qeelin/i.test(text + pageTitle + pageUrl)) {
    company = "Kering / Qeelin";
  }

  const clean = sanitizeJobMeta({
    company,
    title: title || urlHints?.title || "",
    location: guessLocation(text),
  });

  return {
    title: clean.title.slice(0, 120),
    company: clean.company.slice(0, 80),
    location: clean.location,
    salary: guessSalary(text),
    description: text.slice(0, 12000),
    keywords: extractKeywordCandidates(text),
  };
}

function guessLocation(text: string) {
  const m = text.match(
    /(?:地点|Location|工作地点|Work Location)[:：\s]+([A-Za-z\u4e00-\u9fff\s,/·-]{2,40})/i
  );
  if (m) return m[1].trim();
  if (/香港|Hong Kong|HK/i.test(text)) return "Hong Kong";
  if (/上海|Shanghai/i.test(text)) return "Shanghai";
  if (/深圳|Shenzhen/i.test(text)) return "Shenzhen";
  if (/新加坡|Singapore/i.test(text)) return "Singapore";
  return "未识别";
}

function guessSalary(text: string) {
  const m = text.match(
    /(?:HK\$|USD|S\$|¥|RMB|薪资|Salary)[^\n]{0,40}\d[\d,\s\-–~kK万+]*/i
  );
  return m?.[0]?.trim().slice(0, 40) || "面议";
}

function extractKeywordCandidates(text: string) {
  const bag = text.toLowerCase();
  const lexicon = [
    "ESG",
    "可持续",
    "sustainability",
    "climate",
    "TCFD",
    "ISSB",
    "GRI",
    "Python",
    "数据分析",
    "碳中和",
    "披露",
    "尽调",
    "投资",
    "产品",
    "沟通",
  ];
  return lexicon.filter((k) => bag.includes(k.toLowerCase())).slice(0, 8);
}
