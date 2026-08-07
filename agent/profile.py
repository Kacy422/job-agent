"""Applicant profile defaults + Hong Kong recruitment field recognition."""

from __future__ import annotations

import re
from typing import Any


# ─── Contact / phone ─────────────────────────────────────────────────────────
DEFAULT_CONTACT: dict[str, str] = {
    "phone_country_code": "+852",
    "phone_number": "65733452",
    "full_phone": "+852 65733452",
}

# ─── GPA ─────────────────────────────────────────────────────────────────────
DEFAULT_GPA: dict[str, str] = {
    "score": "3.8",
    "scale": "4.0",
    "percentage": "88%",
    "gpa_text": "3.8 / 4.0",
}

# Preset personal info for HK applications (flat keys used by filler)
DEFAULT_APPLICANT_PROFILE: dict[str, str] = {
    "title": "Ms.",
    "surname": "Wu",
    "given_name": "Xuelian",
    "preferred_name": "Kacy",
    "full_name": "WU XUELIAN, KACY",
    "email": "wuxuelian25@126.com",
    "phone": DEFAULT_CONTACT["full_phone"],
    "phone_country_code": DEFAULT_CONTACT["phone_country_code"],
    "phone_number": DEFAULT_CONTACT["phone_number"],
    "full_phone": DEFAULT_CONTACT["full_phone"],
    "city": "Hong Kong",
    "hkid": "",
    "passport": "",
    "work_visa_status": "IANG",
    # Eligible to work in HK under IANG / TTPS / Dependent Visa
    "work_eligible": "Yes",
    # IANG holders typically do NOT need employer sponsorship
    "visa_sponsorship": "No",
    "available_date": "",
    "expected_salary": "",
    "education_level": "Master's Degree",
    "education_level_alt": "Postgraduate",
    "gpa_score": DEFAULT_GPA["score"],
    "gpa_scale": DEFAULT_GPA["scale"],
    "gpa_percentage": DEFAULT_GPA["percentage"],
    "gpa_text": DEFAULT_GPA["gpa_text"],
}


# Country-code option synonyms for split phone dialers
COUNTRY_CODE_OPTION_HINTS: dict[str, list[str]] = {
    "+852": [
        "+852",
        "852",
        "hong kong",
        "hongkong",
        "hk",
        "香港",
        "hkg",
    ],
    "+86": [
        "+86",
        "86",
        "china",
        "mainland",
        "prc",
        "中国",
        "中國",
        "chn",
    ],
}


# Synonym banks for choice matching (education / visa / yes-no)
EDUCATION_SYNONYMS: list[str] = [
    "master's degree",
    "masters degree",
    "master degree",
    "master's",
    "masters",
    "master",
    "postgraduate",
    "post graduate",
    "post-graduate",
    "taught postgraduate",
    "msc",
    "m.sc",
    "m.sc.",
    "ma",
    "m.a.",
    "研究生",
    "硕士",
    "碩士",
]

VISA_STATUS_SYNONYMS: list[str] = [
    "iang",
    "i.a.n.g",
    "immigration arrangements for non-local graduates",
    "ttps",
    "top talent",
    "dependent visa",
    "dependant visa",
    "dependent",
    "dependant",
    "eligible to work",
    "right to work",
    "work visa",
    "工作簽證",
    "工作签证",
]

YES_SYNONYMS: list[str] = [
    "yes",
    "y",
    "true",
    "agree",
    "eligible",
    "i am eligible",
    "have the right",
    "authorized",
    "authorised",
    "是",
    "有",
    "可以",
]

NO_SYNONYMS: list[str] = [
    "no",
    "n",
    "false",
    "not required",
    "do not require",
    "don't require",
    "not needed",
    "否",
    "不需要",
    "无需",
    "無需",
]


# (compiled regex on label, profile key)
# Ordered: more specific patterns first
HK_FIELD_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"\b(country\s*code|dial(ling)?\s*code|area\s*code|"
            r"phone\s*code|intl\.?\s*code|international\s*code|"
            r"区号|區號|國家代碼|国家代码)\b",
            re.I,
        ),
        "phone_country_code",
    ),
    (
        re.compile(
            r"\b(gpa|cgpa|grade\s*point(\s*average)?|academic\s*standing|"
            r"cum(ulative)?\s*gpa|平均绩点|平均績點)\b",
            re.I,
        ),
        "gpa",
    ),
    (
        re.compile(
            r"\b(out\s*of|full\s*marks?|maximum(\s*gpa)?|gpa\s*scale|"
            r"scale|满分|滿分|總分|总分)\b",
            re.I,
        ),
        "gpa_scale",
    ),
    (
        re.compile(
            r"\b(education\s*level|highest\s*(degree|qualification|education)|"
            r"degree\s*level|academic\s*qualification|学历|學歷|学位|學位)\b",
            re.I,
        ),
        "education_level",
    ),
    (
        re.compile(
            r"\b(require.{0,24}(visa\s*)?sponsorship|visa\s*sponsorship|"
            r"need.{0,16}sponsorship|sponsorship\s*required|"
            r"需要.{0,8}担保|需要.{0,8}擔保)\b",
            re.I,
        ),
        "visa_sponsorship",
    ),
    (
        re.compile(
            r"\b(eligible\s*to\s*work|right\s*to\s*work|work\s*eligibility|"
            r"legally\s*(able|allowed)\s*to\s*work|authori[sz]ed\s*to\s*work|"
            r"可否在港工作|有权在港工作|有權在港工作)\b",
            re.I,
        ),
        "work_eligible",
    ),
    (
        re.compile(
            r"\b(salutation|title|prefix|称谓|稱謂|称呼|稱呼)\b|"
            r"\b(mr\.?|mrs\.?|ms\.?|miss|dr\.?)\b.*\b(select|choose)?",
            re.I,
        ),
        "title",
    ),
    (
        re.compile(
            r"\b(surname|family\s*name|last\s*name|姓氏?|last)\b",
            re.I,
        ),
        "surname",
    ),
    (
        re.compile(
            r"\b(given\s*name|first\s*name|forename|名(?!称)|english\s*name)\b",
            re.I,
        ),
        "given_name",
    ),
    (
        re.compile(
            r"\b(preferred\s*name|nickname|known\s*as|常用名|英文名|display\s*name)\b",
            re.I,
        ),
        "preferred_name",
    ),
    (
        re.compile(
            r"\b(hkid|h\.?k\.?\s*i\.?d\.?|hong\s*kong\s*i\.?d\.?|"
            r"identity\s*card|身份證|身份证|hk\s*id)\b",
            re.I,
        ),
        "hkid",
    ),
    (
        re.compile(r"\b(passport|護照|护照|travel\s*document)\b", re.I),
        "passport",
    ),
    (
        re.compile(
            r"\b(work\s*visa|visa\s*status|immigration|right\s*to\s*work|"
            r"iang|ttps|employment\s*visa|工作簽證|工作签证|"
            r"visa\s*type|eligibility\s*to\s*work)\b",
            re.I,
        ),
        "work_visa_status",
    ),
    (
        re.compile(
            r"\b(available\s*(date|from|start)|earliest\s*(start|join)|"
            r"notice\s*period|start\s*date|入職|入职|到岗|可到岗)\b",
            re.I,
        ),
        "available_date",
    ),
    (
        re.compile(
            r"\b(expected\s*salary|salary\s*expectation|current\s*salary|"
            r"desired\s*salary|remuneration|期望薪金|期望薪资|薪金要求|"
            r"月薪|年薪)\b",
            re.I,
        ),
        "expected_salary",
    ),
    (
        re.compile(r"\b(e-?mail|邮箱|電郵|电邮|電子郵箱)\b", re.I),
        "email",
    ),
    (
        re.compile(
            r"\b(phone|mobile|tel|telephone|contact\s*no\.?|contact\s*number|"
            r"電話|电话|手機|手机|聯絡電話|联系电话|手提)\b",
            re.I,
        ),
        "phone",
    ),
    (
        re.compile(
            r"\b(full\s*name|legal\s*name|candidate\s*name|姓名|全名)\b",
            re.I,
        ),
        "full_name",
    ),
    (
        re.compile(
            r"\b(city|location|current\s*city|现居|現居|居住|所在地)\b",
            re.I,
        ),
        "city",
    ),
]


SUPPLEMENTABLE_KEYS = [
    "hkid",
    "passport",
    "work_visa_status",
    "available_date",
    "expected_salary",
    "title",
    "surname",
    "given_name",
    "preferred_name",
    "gpa_score",
    "phone_number",
]

FIELD_LABELS_EN: dict[str, str] = {
    "title": "Title / Salutation",
    "surname": "Surname",
    "given_name": "Given Name",
    "preferred_name": "Preferred Name",
    "hkid": "HKID / Identity Card",
    "passport": "Passport Number",
    "work_visa_status": "Work Visa Status (IANG / TTPS)",
    "available_date": "Available Date / Earliest Start",
    "expected_salary": "Expected Salary",
    "email": "Email",
    "phone": "Phone",
    "phone_country_code": "Phone Country Code",
    "phone_number": "Phone Number",
    "full_name": "Full Name",
    "city": "City / Location",
    "education_level": "Education Level",
    "gpa_score": "GPA Score",
    "gpa_scale": "GPA Scale",
    "visa_sponsorship": "Visa Sponsorship",
    "work_eligible": "Work Eligibility",
}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def identify_profile_key(label: str) -> str | None:
    text = (label or "").strip()
    if not text:
        return None
    for pattern, key in HK_FIELD_PATTERNS:
        if pattern.search(text):
            return key
    return None


def is_phone_local_only_label(label: str) -> bool:
    """True when the field wants local digits only (not full intl)."""
    n = _norm(label)
    if re.search(
        r"country\s*code|dial(ling)?\s*code|area\s*code|区号|區號", n
    ):
        return False
    if re.search(
        r"\b(local|mobile\s*number|phone\s*number|number\s*only|"
        r"without\s*country|excluding\s*code|号码|號碼)\b",
        n,
    ):
        return True
    # Generic phone next to a country-code sibling is handled separately
    return False


def is_gpa_score_label(label: str) -> bool:
    n = _norm(label)
    if re.search(r"out\s*of|full\s*marks?|maximum|scale|满分|滿分", n):
        return False
    return bool(
        re.search(r"\b(gpa|cgpa|grade\s*point|score|成绩|成績)\b", n)
    )


def is_gpa_scale_label(label: str) -> bool:
    n = _norm(label)
    return bool(
        re.search(r"out\s*of|full\s*marks?|maximum|gpa\s*scale|scale|满分|滿分", n)
    )


def parse_phone_parts(raw: str) -> tuple[str, str, str]:
    """Return (country_code, local_number, full_phone)."""
    text = (raw or "").strip()
    if not text:
        return (
            DEFAULT_CONTACT["phone_country_code"],
            DEFAULT_CONTACT["phone_number"],
            DEFAULT_CONTACT["full_phone"],
        )
    m = re.match(r"^\s*(\+\d{1,4})\s*[-–—]?\s*(.+)$", text)
    if m:
        code = m.group(1)
        local = re.sub(r"\D", "", m.group(2))
        return code, local, f"{code} {local}".strip()
    digits = re.sub(r"\D", "", text)
    if digits.startswith("852") and len(digits) >= 11:
        return "+852", digits[3:], f"+852 {digits[3:]}"
    if digits.startswith("86") and len(digits) >= 12:
        return "+86", digits[2:], f"+86 {digits[2:]}"
    if len(digits) == 8:
        return "+852", digits, f"+852 {digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return "+86", digits, f"+86 {digits}"
    return (
        DEFAULT_CONTACT["phone_country_code"],
        digits or DEFAULT_CONTACT["phone_number"],
        text if text.startswith("+") else f"+852 {digits}",
    )


def resolve_phone_value(label: str, profile: dict[str, str]) -> str | None:
    """Pick country code / local / full phone based on field label."""
    key = identify_profile_key(label)
    n = _norm(label)
    code = profile.get("phone_country_code") or DEFAULT_CONTACT["phone_country_code"]
    local = profile.get("phone_number") or DEFAULT_CONTACT["phone_number"]
    full = profile.get("full_phone") or profile.get("phone") or DEFAULT_CONTACT["full_phone"]

    if key == "phone_country_code" or re.search(
        r"country\s*code|dial(ling)?\s*code|area\s*code|区号|區號", n
    ):
        return code
    if is_phone_local_only_label(label) or (
        key == "phone"
        and re.search(r"\b(number|号码|號碼|mobile)\b", n)
        and "code" not in n
        and "country" not in n
    ):
        # Prefer local digits when label looks like a number box
        if re.search(r"full|complete|with\s*country|intl|国际|國際", n):
            return full
        return local
    if key == "phone":
        return full
    return None


def resolve_gpa_value(label: str, profile: dict[str, str]) -> str | None:
    key = identify_profile_key(label)
    n = _norm(label)
    score = profile.get("gpa_score") or DEFAULT_GPA["score"]
    scale = profile.get("gpa_scale") or DEFAULT_GPA["scale"]
    pct = profile.get("gpa_percentage") or DEFAULT_GPA["percentage"]
    text = profile.get("gpa_text") or DEFAULT_GPA["gpa_text"]

    if key == "gpa_scale" or is_gpa_scale_label(label):
        return scale

    if key == "gpa" or is_gpa_score_label(label) or "gpa" in n or "cgpa" in n:
        if "percentage" in n or "%" in n:
            return pct
        # Explicit score-only boxes
        if re.search(r"\b(score|point)\b", n) and not is_gpa_scale_label(label):
            return score
        # Combined / generic GPA field → "3.8 / 4.0"
        if re.search(r"\b(gpa|cgpa|grade\s*point|academic\s*standing)\b", n):
            if is_gpa_scale_label(label):
                return scale
            # "GPA Score" already handled; bare "GPA" gets combined text
            if re.search(r"\bscore\b", n):
                return score
            return text
        return text
    return None


def token_set(s: str) -> set[str]:
    return set(re.findall(r"[a-z0-9+]+", _norm(s)))


def semantic_option_score(option_text: str, targets: list[str]) -> float:
    """
    Lightweight semantic similarity (no LLM round-trip):
    synonym containment + token Jaccard against preferred answers.
    """
    opt = _norm(option_text)
    if not opt or opt in ("--", "please select", "select", "n/a", "na"):
        return -1.0
    best = 0.0
    opt_tokens = token_set(opt)
    for target in targets:
        t = _norm(target)
        if not t:
            continue
        if opt == t or t in opt or opt in t:
            best = max(best, 1.0)
            continue
        # digit / code exact (+852)
        if t.startswith("+") and t.replace(" ", "") in opt.replace(" ", ""):
            best = max(best, 0.98)
            continue
        tt = token_set(t)
        if not tt:
            continue
        inter = len(opt_tokens & tt)
        union = len(opt_tokens | tt) or 1
        jaccard = inter / union
        # boost if key synonym word present
        boost = 0.15 if inter else 0.0
        best = max(best, min(1.0, jaccard + boost))
    return best


def preferred_answers_for_key(key: str, profile: dict[str, str]) -> list[str]:
    """Ordered preferred option texts for a profile key / question type."""
    if key == "education_level":
        primary = profile.get("education_level") or "Master's Degree"
        alt = profile.get("education_level_alt") or "Postgraduate"
        return [primary, alt, *EDUCATION_SYNONYMS]
    if key == "work_visa_status":
        status = profile.get("work_visa_status") or "IANG"
        return [status, "IANG", "TTPS", "Dependent Visa", *VISA_STATUS_SYNONYMS]
    if key == "work_eligible":
        ans = profile.get("work_eligible") or "Yes"
        # Prefer options that mention visa schemes OR plain Yes
        return [
            ans,
            "Yes - IANG",
            "Yes (IANG)",
            "IANG",
            "TTPS",
            "Dependent Visa",
            *YES_SYNONYMS,
            *VISA_STATUS_SYNONYMS,
        ]
    if key == "visa_sponsorship":
        # IANG/TTPS: usually do NOT need sponsorship; still prefer explicit visa options
        ans = profile.get("visa_sponsorship") or "No"
        return [
            "IANG",
            "TTPS",
            "Dependent Visa",
            "No",
            ans,
            *NO_SYNONYMS,
            *VISA_STATUS_SYNONYMS,
        ]
    if key == "phone_country_code":
        code = profile.get("phone_country_code") or "+852"
        return [code, *COUNTRY_CODE_OPTION_HINTS.get(code, [])]
    if key == "title":
        title = profile.get("title") or "Ms."
        return [title, "Ms", "Miss", "Mrs", "Ms."]
    if key in profile and profile[key]:
        return [profile[key]]
    return []


def pick_best_option(
    options: list[dict[str, str]],
    targets: list[str],
    min_score: float = 0.35,
) -> dict[str, str] | None:
    """Pick option dict {value, text} with highest semantic score."""
    best: dict[str, str] | None = None
    best_score = min_score
    for opt in options:
        text = str(opt.get("text") or "")
        value = str(opt.get("value") or "")
        score = max(
            semantic_option_score(text, targets),
            semantic_option_score(value, targets),
        )
        if score > best_score:
            best_score = score
            best = opt
    return best


def merge_profile(overrides: dict[str, Any] | None = None) -> dict[str, str]:
    """Merge frontend profile payload onto defaults (flat string map)."""
    base = dict(DEFAULT_APPLICANT_PROFILE)
    if not overrides:
        return base

    # Nested contact block
    contact = overrides.get("contact")
    if isinstance(contact, dict):
        for k in ("phone_country_code", "phone_number", "full_phone"):
            if contact.get(k):
                base[k] = str(contact[k]).strip()
        if contact.get("full_phone"):
            base["phone"] = str(contact["full_phone"]).strip()

    # Nested gpa block
    gpa = overrides.get("gpa")
    if isinstance(gpa, dict):
        if gpa.get("score"):
            base["gpa_score"] = str(gpa["score"]).strip()
        if gpa.get("scale"):
            base["gpa_scale"] = str(gpa["scale"]).strip()
        if gpa.get("percentage"):
            base["gpa_percentage"] = str(gpa["percentage"]).strip()
        if gpa.get("gpa_text"):
            base["gpa_text"] = str(gpa["gpa_text"]).strip()
        elif gpa.get("score") and gpa.get("scale"):
            base["gpa_text"] = f"{gpa['score']} / {gpa['scale']}"

    mapping = {
        "title": "title",
        "surname": "surname",
        "givenName": "given_name",
        "given_name": "given_name",
        "preferredName": "preferred_name",
        "preferred_name": "preferred_name",
        "contactEmail": "email",
        "email": "email",
        "contactPhone": "phone",
        "phone": "phone",
        "phoneCountryCode": "phone_country_code",
        "phone_country_code": "phone_country_code",
        "phoneNumber": "phone_number",
        "phone_number": "phone_number",
        "fullPhone": "full_phone",
        "full_phone": "full_phone",
        "contactName": "full_name",
        "full_name": "full_name",
        "fullName": "full_name",
        "hkid": "hkid",
        "passport": "passport",
        "workVisaStatus": "work_visa_status",
        "work_visa_status": "work_visa_status",
        "workEligible": "work_eligible",
        "work_eligible": "work_eligible",
        "visaSponsorship": "visa_sponsorship",
        "visa_sponsorship": "visa_sponsorship",
        "availableDate": "available_date",
        "available_date": "available_date",
        "expectedSalary": "expected_salary",
        "expected_salary": "expected_salary",
        "educationLevel": "education_level",
        "education_level": "education_level",
        "gpaScore": "gpa_score",
        "gpa_score": "gpa_score",
        "gpaScale": "gpa_scale",
        "gpa_scale": "gpa_scale",
        "gpaPercentage": "gpa_percentage",
        "gpa_percentage": "gpa_percentage",
        "gpaText": "gpa_text",
        "gpa_text": "gpa_text",
        "city": "city",
    }
    for src, dest in mapping.items():
        if src in overrides and overrides[src] is not None:
            val = str(overrides[src]).strip()
            if val:
                base[dest] = val

    # Derive phone parts from contactPhone / phone if nested not provided
    phone_raw = base.get("full_phone") or base.get("phone") or ""
    if phone_raw:
        code, local, full = parse_phone_parts(phone_raw)
        base.setdefault("phone_country_code", code)
        base.setdefault("phone_number", local)
        base["full_phone"] = base.get("full_phone") or full
        base["phone"] = base["full_phone"]
        if overrides.get("phoneCountryCode") or overrides.get("phone_country_code"):
            base["phone_country_code"] = str(
                overrides.get("phoneCountryCode")
                or overrides.get("phone_country_code")
            ).strip()
        if overrides.get("phoneNumber") or overrides.get("phone_number"):
            base["phone_number"] = str(
                overrides.get("phoneNumber") or overrides.get("phone_number")
            ).strip()
        # Rebuild full if parts present
        if base.get("phone_country_code") and base.get("phone_number"):
            base["full_phone"] = (
                f"{base['phone_country_code']} {base['phone_number']}".strip()
            )
            base["phone"] = base["full_phone"]

    # GPA text sync
    if base.get("gpa_score") and base.get("gpa_scale"):
        base["gpa_text"] = (
            base.get("gpa_text")
            or f"{base['gpa_score']} / {base['gpa_scale']}"
        )

    extras = overrides.get("applyExtras") or overrides.get("apply_extras") or {}
    if isinstance(extras, dict):
        for k, v in extras.items():
            if v is not None and str(v).strip():
                base[str(k).strip().lower()] = str(v).strip()

    return base


def profile_to_form_fields(profile: dict[str, str]) -> list[dict[str, str]]:
    """Build label/value pairs for Playwright filler."""
    pairs = [
        ("Title", profile.get("title", "")),
        ("Surname", profile.get("surname", "")),
        ("Given Name", profile.get("given_name", "")),
        ("Preferred Name", profile.get("preferred_name", "")),
        ("Full Name", profile.get("full_name", "")),
        ("Email", profile.get("email", "")),
        ("Phone", profile.get("full_phone") or profile.get("phone", "")),
        ("Phone Country Code", profile.get("phone_country_code", "")),
        ("Phone Number", profile.get("phone_number", "")),
        ("Mobile", profile.get("full_phone") or profile.get("phone", "")),
        ("Telephone", profile.get("full_phone") or profile.get("phone", "")),
        ("Contact No", profile.get("full_phone") or profile.get("phone", "")),
        ("City", profile.get("city", "Hong Kong")),
        ("HKID", profile.get("hkid", "")),
        ("Passport", profile.get("passport", "")),
        ("Work Visa Status", profile.get("work_visa_status", "")),
        ("Education Level", profile.get("education_level", "")),
        ("GPA", profile.get("gpa_text", "")),
        ("GPA Score", profile.get("gpa_score", "")),
        ("Out of", profile.get("gpa_scale", "")),
        ("Available Date", profile.get("available_date", "")),
        ("Expected Salary", profile.get("expected_salary", "")),
    ]
    return [{"label": k, "value": v} for k, v in pairs if v]


def missing_supplement_fields(
    detected_keys: list[str],
    profile: dict[str, str],
) -> list[dict[str, str]]:
    """Return HK common fields present on the page but empty in profile."""
    missing: list[dict[str, str]] = []
    seen: set[str] = set()
    for key in detected_keys:
        check_key = "gpa_score" if key == "gpa" else key
        if check_key not in SUPPLEMENTABLE_KEYS or check_key in seen:
            continue
        seen.add(check_key)
        if not (profile.get(check_key) or "").strip():
            missing.append(
                {
                    "key": check_key,
                    "label": FIELD_LABELS_EN.get(check_key, check_key),
                    "hint": f"Required by the application form ({check_key})",
                }
            )
    return missing
