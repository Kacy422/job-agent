import { callDeepSeek, extractJson, getDeepSeekKey } from "@/lib/deepseek";
import { heuristicParse, parseHintsFromUrl } from "@/lib/scrape";
import { sanitizeJobMeta } from "@/lib/job-meta";
import type { ParsedJobPage } from "@/types";

const EXTRACT_SYSTEM = `你是招聘信息抽取专家。从网页正文 / 粘贴 JD / URL 线索提取岗位信息，输出严格 JSON：
{"title":"岗位名称","company":"公司名","location":"地点","salary":"薪资或面议","description":"完整 JD 文本（必须保留原有换行与分段，用 \\n 表示换行，不要压成单行）","keywords":["技能/职责关键词最多12个"],"applyUrl":"若文中有独立网申链接则给出，否则空字符串"}

=== 字段边界（必须严格遵守，禁止混淆）===
1) company：仅品牌 / 公司 / 集团名（如 Kering、Qeelin、Kering / Qeelin、Google、Crossroads Foundation）。
2) title：仅岗位职能名（如 ESG and Sustainability Intern、Sustainability Analyst）。不要把公司名写进 title。
3) location：城市/地区（Hong Kong、HK、China、Shanghai、Singapore 等）—— 只能放在 location。
4) employment type（Full-time / Part-time / Internship / Remote / Hybrid / Contract）不是公司名，也不是岗位名；可忽略或写入 description，禁止写入 company / title。

=== 严禁误判（反例）===
- 禁止 company = "HK" / "Hong Kong" / "China" / "Full-time" / "Remote"
- 禁止 title = "Hong Kong" / "Full-time" / "Internship"（单独一词时）
- 错误：company="QEELIN ESG and Sustainability Intern"
- 正确：company="Kering / Qeelin" 或 "Qeelin"，title="ESG and Sustainability Intern"

=== 其它 ===
- 可结合 URL path 辅助判断，但仍须拆分 company / title / location。
- 不要编造正文与 URL 都没有的信息；不确定的 company/title 宁可用空字符串。`;

export async function extractJobFromPage(
  pageTitle: string,
  pageText: string,
  pageUrl: string
): Promise<ParsedJobPage> {
  const urlHints = parseHintsFromUrl(pageUrl);

  if (!getDeepSeekKey()) {
    const fb = heuristicParse(pageTitle, pageText, pageUrl);
    const clean = sanitizeJobMeta(fb);
    return { ...fb, ...clean, applyUrl: pageUrl };
  }

  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content: EXTRACT_SYSTEM,
        },
        {
          role: "user",
          content: `页面 URL：${pageUrl}
URL 推断线索：company≈${urlHints.company}；title≈${urlHints.title}；path tokens=${urlHints.pathTokens.join(" | ") || "(none)"}
页面标题：${pageTitle}

正文 / 粘贴 JD：
${pageText.slice(0, 14000)}`,
        },
      ],
      { json: true, temperature: 0.1 }
    );

    const parsed = extractJson<ParsedJobPage>(content);
    const fallback = heuristicParse(pageTitle, pageText, pageUrl);

    let title = (parsed.title || fallback.title).slice(0, 160);
    let company = (parsed.company || fallback.company).slice(0, 120);
    let location = (parsed.location || fallback.location).slice(0, 80);

    ({ title, company } = separateCompanyTitle(title, company, pageUrl));
    const clean = sanitizeJobMeta({ company, title, location });

    // 若清洗后公司无效，回退 URL 线索（仍需过 sanitize）
    if (clean.company === "未知公司" && urlHints.company) {
      const fromUrl = sanitizeJobMeta({
        company: urlHints.company,
        title: clean.title !== "未识别岗位" ? clean.title : urlHints.title,
        location: clean.location,
      });
      Object.assign(clean, fromUrl);
    }

    return {
      title: clean.title,
      company: clean.company,
      location: clean.location,
      salary: (parsed.salary || fallback.salary).slice(0, 60),
      description: (parsed.description || fallback.description).slice(0, 12000),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.slice(0, 12)
        : fallback.keywords,
      applyUrl: parsed.applyUrl || pageUrl,
    };
  } catch {
    const fb = heuristicParse(pageTitle, pageText, pageUrl);
    const clean = sanitizeJobMeta(fb);
    return { ...fb, ...clean, applyUrl: pageUrl };
  }
}

function separateCompanyTitle(
  title: string,
  company: string,
  pageUrl: string
): { title: string; company: string } {
  let t = title.trim();
  let c = company.trim();

  const brands = [
    ...c.split(/\s*\/\s*/),
    "QEELIN",
    "Qeelin",
    "Kering",
    "LVMH",
  ].filter((b) => b && b.length > 1);

  for (const brand of brands) {
    const re = new RegExp(
      `^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*[-–—:/|]\\s*|\\s+)`,
      "i"
    );
    if (re.test(t)) {
      t = t.replace(re, "").trim();
    }
  }

  if (t && c && t.toLowerCase() === c.toLowerCase()) {
    const hints = parseHintsFromUrl(pageUrl);
    c = hints.company;
    t = hints.title;
  }

  if (/kering/i.test(pageUrl) && /qeelin/i.test(`${t} ${c} ${pageUrl}`)) {
    if (!/kering/i.test(c)) c = "Kering / Qeelin";
  }

  if (
    /\b(intern|analyst|manager|associate|officer)\b/i.test(c) &&
    t.length < 3
  ) {
    const hints = parseHintsFromUrl(pageUrl);
    t =
      c
        .replace(
          new RegExp(
            `^(${brands.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s+`,
            "i"
          ),
          ""
        )
        .trim() || hints.title;
    c = hints.company;
  }

  return {
    title: t || title || "",
    company: c || company || "",
  };
}
