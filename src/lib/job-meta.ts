/** 地点 / 雇佣形式 —— 禁止误判为公司名或岗位名 */
const LOCATION_OR_TYPE_EXACT = new Set(
  [
    "hk",
    "hong kong",
    "hongkong",
    "china",
    "mainland china",
    "prc",
    "singapore",
    "shanghai",
    "shenzhen",
    "beijing",
    "guangzhou",
    "remote",
    "hybrid",
    "on-site",
    "onsite",
    "on site",
    "full-time",
    "full time",
    "part-time",
    "part time",
    "internship",
    "intern",
    "contract",
    "temporary",
    "permanent",
    "freelance",
    "香港",
    "中国",
    "内地",
    "大陆",
    "新加坡",
    "上海",
    "深圳",
    "北京",
    "广州",
    "全职",
    "兼职",
    "实习",
    "远程",
    "混合",
    "现场",
    "未知公司",
    "未识别岗位",
    "未命名公司",
    "未命名岗位",
  ].map((s) => s.toLowerCase())
);

const LOCATION_OR_TYPE_RE =
  /^(hong\s*kong|china|mainland(\s*china)?|singapore|full[\s-]?time|part[\s-]?time|remote|hybrid|on[\s-]?site|contract|internship|temporary|permanent|hk|cn|sg)$/i;

export function isLocationOrEmploymentType(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v) return true;
  if (LOCATION_OR_TYPE_EXACT.has(v.toLowerCase())) return true;
  if (LOCATION_OR_TYPE_RE.test(v)) return true;
  // 纯地区缩写 / 标签
  if (/^(HK|CN|SG|UK|US|UAE|APAC)$/i.test(v)) return true;
  return false;
}

export function isValidCompanyName(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (v.length < 2) return false;
  if (isLocationOrEmploymentType(v)) return false;
  // 明显是职位句而非公司
  if (
    /\b(intern|internship|analyst|manager|associate|officer|specialist|engineer|coordinator|assistant)\b/i.test(
      v
    ) &&
    !/\b(ltd|limited|inc|corp|foundation|university|group|holdings|company)\b/i.test(
      v
    )
  ) {
    // 允许 "Crossroads Foundation" 类；拦截 "ESG Intern"
    if (/^\s*(esg|sustainability|climate).*(intern|analyst)/i.test(v)) {
      return false;
    }
  }
  return true;
}

export function isValidJobTitle(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (v.length < 2) return false;
  if (isLocationOrEmploymentType(v)) return false;
  return true;
}

/** 清洗 LLM / 启发式结果，剔除地点误填 */
export function sanitizeJobMeta(input: {
  company?: string;
  title?: string;
  location?: string;
}): { company: string; title: string; location: string } {
  let company = String(input.company || "").trim();
  let title = String(input.title || "").trim();
  let location = String(input.location || "").trim();

  if (company && isLocationOrEmploymentType(company)) {
    // 若公司被填成地点，挪到 location
    if (!location || isLocationOrEmploymentType(location)) {
      location = company;
    }
    company = "";
  }

  if (title && isLocationOrEmploymentType(title)) {
    if (!location) location = title;
    title = "";
  }

  // title 末尾挂地点： "Intern - Hong Kong"
  title = title
    .replace(
      /\s*[-–—|,]\s*(Hong Kong|HK|China|Singapore|Shanghai|Shenzhen|Remote|Hybrid|Full-?time|Part-?time)\s*$/i,
      ""
    )
    .trim();

  if (!isValidCompanyName(company)) company = "";
  if (!isValidJobTitle(title)) title = "";

  return {
    company: company || "未知公司",
    title: title || "未识别岗位",
    location: location || "未识别",
  };
}
