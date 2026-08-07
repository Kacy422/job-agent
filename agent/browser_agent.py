"""Playwright headed browser session + smart form filler."""

from __future__ import annotations

import re
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, async_playwright, Playwright

from profile import (
    identify_profile_key,
    merge_profile,
    missing_supplement_fields,
    pick_best_option,
    preferred_answers_for_key,
    resolve_gpa_value,
    resolve_phone_value,
    semantic_option_score,
)


ALIAS_GROUPS: list[tuple[list[str], list[str]]] = [
    (
        ["full name", "fullname", "姓名", "全名", "candidate name", "legal name"],
        ["full name", "全名", "姓名", "name"],
    ),
    (
        ["email", "e-mail", "邮箱", "電子郵箱", "电子邮件", "電郵"],
        ["email", "邮箱"],
    ),
    (
        [
            "phone",
            "mobile",
            "tel",
            "telephone",
            "contact no",
            "contact number",
            "电话",
            "電話",
            "手機",
            "手机",
            "联系电话",
            "聯絡電話",
        ],
        ["phone", "mobile", "telephone", "contact no", "电话", "手机"],
    ),
    (
        ["city", "location", "address", "城市", "现居", "現居", "居住", "所在地"],
        ["city", "现居城市", "城市", "location"],
    ),
    (
        ["linkedin", "领英"],
        ["linkedin", "领英"],
    ),
    (
        ["job title", "position", "desired role", "期望职位", "应聘职位", "申请职位"],
        ["期望职位", "职位", "job title"],
    ),
    (
        ["education level", "highest degree", "degree level", "学历", "學歷"],
        ["education level", "education"],
    ),
    (
        ["education", "school", "degree", "教育", "院校"],
        ["教育背景摘要", "教育", "education"],
    ),
    (
        ["gpa", "cgpa", "grade point", "academic standing"],
        ["gpa", "gpa score", "gpa text"],
    ),
    (
        ["experience", "employment", "work history", "工作经历", "工作經驗", "实习"],
        ["工作经历摘要", "工作经历", "experience"],
    ),
    (
        ["cover letter", "coverletter", "自述", "求职信", "申請信", "motivation"],
        ["cover letter", "自述信", "求职信"],
    ),
    (
        ["why company", "why us", "why this company", "为什么选择"],
        ["why company"],
    ),
    (
        ["why role", "why this role", "为什么申请"],
        ["why role"],
    ),
    (
        ["strength", "优势", "技能亮点"],
        ["strengths", "你的优势"],
    ),
    (
        ["resume", "cv", "简历", "履历"],
        ["工作经历摘要", "教育背景摘要"],
    ),
    (
        ["title", "salutation", "称谓", "稱謂", "mr", "mrs", "ms"],
        ["title"],
    ),
    (
        ["surname", "family name", "last name", "姓"],
        ["surname"],
    ),
    (
        ["given name", "first name", "forename"],
        ["given name"],
    ),
    (
        ["preferred name", "nickname", "常用名"],
        ["preferred name"],
    ),
    (
        ["hkid", "hong kong id", "identity card", "身份證", "身份证"],
        ["hkid"],
    ),
    (
        ["passport", "護照", "护照"],
        ["passport"],
    ),
    (
        ["work visa", "visa status", "iang", "ttps", "工作簽證", "工作签证"],
        ["work visa status"],
    ),
    (
        ["available date", "earliest start", "start date", "notice period", "可到岗"],
        ["available date"],
    ),
    (
        ["expected salary", "salary expectation", "期望薪金", "期望薪资"],
        ["expected salary"],
    ),
]


class BrowserSession:
    def __init__(self) -> None:
        self._pw: Playwright | None = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None

    async def start(self) -> None:
        self._pw = await async_playwright().start()
        self.browser = await self._pw.chromium.launch(
            headless=False,
            args=["--start-maximized"],
        )
        self.context = await self.browser.new_context(
            no_viewport=True,
            locale="en-HK",
        )
        self.page = await self.context.new_page()

    async def goto(self, url: str) -> None:
        assert self.page
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await self.page.wait_for_timeout(800)

    async def close(self) -> None:
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self._pw:
                await self._pw.stop()
        finally:
            self.page = None
            self.context = None
            self.browser = None
            self._pw = None


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _lookup_value(
    label: str,
    fields: list[dict[str, str]],
    extra_texts: dict[str, str],
    profile: dict[str, str],
) -> str | None:
    n = _norm(label)
    if not n:
        return None

    # Phone / GPA specialised resolvers first
    phone_val = resolve_phone_value(label, profile)
    if phone_val is not None and identify_profile_key(label) in (
        "phone",
        "phone_country_code",
        None,
    ):
        # Only trust phone_val when label is phone-related
        if identify_profile_key(label) in ("phone", "phone_country_code") or any(
            x in n
            for x in (
                "phone",
                "mobile",
                "tel",
                "telephone",
                "contact no",
                "电话",
                "電話",
                "手机",
                "手機",
            )
        ):
            return phone_val

    gpa_val = resolve_gpa_value(label, profile)
    if gpa_val is not None:
        return gpa_val

    pkey = identify_profile_key(label)
    if pkey in (
        "education_level",
        "work_visa_status",
        "work_eligible",
        "visa_sponsorship",
        "title",
    ):
        # Choice fields resolved via option matcher; still provide text fallback
        prefs = preferred_answers_for_key(pkey, profile)
        if prefs:
            return prefs[0]

    if pkey and profile.get(pkey):
        return profile[pkey]

    for f in fields:
        fl = _norm(f.get("label", ""))
        if fl and (fl in n or n in fl):
            return f.get("value") or None

    for aliases, preferred_labels in ALIAS_GROUPS:
        if any(a in n for a in aliases):
            for pref in preferred_labels:
                for f in fields:
                    if _norm(f.get("label", "")) == _norm(pref) or _norm(pref) in _norm(
                        f.get("label", "")
                    ):
                        if f.get("value"):
                            return f["value"]
            for a in aliases:
                if a in extra_texts and extra_texts[a]:
                    return extra_texts[a]
            if pkey and profile.get(pkey):
                return profile[pkey]

    for key, val in extra_texts.items():
        kn = _norm(key)
        if kn and (kn in n or n in kn) and val:
            return val

    return None


async def _field_label(page: Page, el) -> str:
    """Best-effort accessible label for an input/textarea/select."""
    try:
        label = await el.evaluate(
            """(el) => {
              const byAria = el.getAttribute('aria-label') || '';
              if (byAria) return byAria;
              const ph = el.getAttribute('placeholder') || '';
              const name = el.getAttribute('name') || '';
              const id = el.id || '';
              if (id) {
                const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
                if (lab && lab.textContent) return lab.textContent;
              }
              const parentLabel = el.closest('label');
              if (parentLabel && parentLabel.textContent) return parentLabel.textContent;
              let prev = el.previousElementSibling;
              for (let i = 0; i < 3 && prev; i++) {
                const t = (prev.textContent || '').trim();
                if (t && t.length < 120) return t;
                prev = prev.previousElementSibling;
              }
              const dt = el.closest('div,li,fieldset,section,.ant-form-item,.el-form-item');
              if (dt) {
                const lab2 = dt.querySelector(
                  'label, legend, .label, .form-label, .ant-form-item-label, .el-form-item__label'
                );
                if (lab2 && lab2.textContent) return lab2.textContent;
              }
              return ph || name || id || '';
            }"""
        )
        return _norm(str(label))
    except Exception:
        return ""


async def _clear_then_fill(el, value: str) -> None:
    """MUST clear demo values before typing."""
    try:
        await el.click(timeout=2000)
    except Exception:
        pass

    try:
        await el.evaluate(
            """(el) => {
              el.focus();
              if (el.tagName === 'SELECT') return;
              el.value = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }"""
        )
    except Exception:
        pass

    try:
        await el.fill("")
    except Exception:
        try:
            await el.press("Control+A")
            await el.press("Backspace")
        except Exception:
            pass

    try:
        await el.fill(value)
    except Exception:
        await el.type(value, delay=8)


async def _read_select_options(el) -> list[dict[str, str]]:
    try:
        options = await el.evaluate(
            """(el) => Array.from(el.options || []).map(o => ({
              value: o.value || '',
              text: (o.textContent || '').trim()
            }))"""
        )
        return list(options or [])
    except Exception:
        return []


async def _select_by_semantics(el, targets: list[str]) -> bool:
    options = await _read_select_options(el)
    pick = pick_best_option(options, targets)
    if not pick:
        return False
    value = str(pick.get("value", ""))
    text = str(pick.get("text", ""))
    try:
        if value != "":
            await el.select_option(value=value)
            return True
    except Exception:
        pass
    try:
        await el.select_option(label=text)
        return True
    except Exception:
        return False


async def _click_choice_in_group(
    page: Page,
    el,
    label: str,
    targets: list[str],
) -> bool:
    """
    Handle native radio/checkbox groups and custom UI
    (Ant Design / Element UI role=radio / li options).
    """
    # 1) Native radio/checkbox with same name
    try:
        name = await el.get_attribute("name")
        input_type = (await el.get_attribute("type") or "").lower()
        if name and input_type in ("radio", "checkbox"):
            group = await page.query_selector_all(
                f'input[type="{input_type}"][name="{name}"]'
            )
            candidates: list[dict[str, Any]] = []
            for node in group:
                try:
                    lab = await _field_label(page, node)
                    sibling_text = await node.evaluate(
                        """(el) => {
                          const lab = el.closest('label');
                          if (lab) return (lab.textContent || '').trim();
                          const next = el.nextElementSibling;
                          if (next) return (next.textContent || '').trim();
                          const parent = el.parentElement;
                          return parent ? (parent.textContent || '').trim() : '';
                        }"""
                    )
                    text = f"{lab} {sibling_text}".strip()
                    val = (await node.get_attribute("value")) or ""
                    score = max(
                        semantic_option_score(text, targets),
                        semantic_option_score(val, targets),
                    )
                    candidates.append(
                        {"node": node, "text": text, "value": val, "score": score}
                    )
                except Exception:
                    continue
            candidates.sort(key=lambda x: x["score"], reverse=True)
            if candidates and candidates[0]["score"] >= 0.35:
                await candidates[0]["node"].click(timeout=2000)
                return True
    except Exception:
        pass

    # 2) Custom radios / listboxes near the labelled parent
    try:
        clicked = await el.evaluate(
            """(el, targets) => {
              const norm = (s) => (s || '').toLowerCase().replace(/\\s+/g, ' ').trim();
              const score = (text, targets) => {
                const t = norm(text);
                let best = 0;
                for (const target of targets) {
                  const g = norm(target);
                  if (!g) continue;
                  if (t === g || t.includes(g) || g.includes(t)) best = Math.max(best, 1);
                  else {
                    const tw = new Set(t.split(/[^a-z0-9+]+/).filter(Boolean));
                    const gw = new Set(g.split(/[^a-z0-9+]+/).filter(Boolean));
                    let inter = 0;
                    for (const w of tw) if (gw.has(w)) inter++;
                    const union = tw.size + gw.size - inter || 1;
                    best = Math.max(best, inter / union);
                  }
                }
                return best;
              };
              const root = el.closest(
                'fieldset, .ant-form-item, .el-form-item, .form-group, [role="radiogroup"], [role="group"], div, section'
              ) || el.parentElement;
              if (!root) return false;
              const nodes = root.querySelectorAll(
                '[role="radio"], [role="option"], .ant-radio-wrapper, .el-radio, .ant-select-item, li[role="option"], label'
              );
              let bestEl = null;
              let bestScore = 0.34;
              nodes.forEach((node) => {
                const text = (node.textContent || '').trim();
                if (!text || text.length > 120) return;
                const s = score(text, targets);
                if (s > bestScore) {
                  bestScore = s;
                  bestEl = node;
                }
              });
              if (bestEl) {
                bestEl.click();
                return true;
              }
              return false;
            }""",
            targets,
        )
        if clicked:
            return True
    except Exception:
        pass

    # 3) Open custom dropdown then pick option
    try:
        trigger = await el.evaluate_handle(
            """(el) => {
              return el.closest('.ant-select, .el-select, [role="combobox"], .Select')
                || el;
            }"""
        )
        if trigger:
            await trigger.as_element().click(timeout=2000)  # type: ignore
            await page.wait_for_timeout(250)
            option = await page.query_selector(
                ".ant-select-item-option, .el-select-dropdown__item, [role='option'], li[role='option']"
            )
            # Score all visible options
            opts = await page.query_selector_all(
                ".ant-select-item-option, .el-select-dropdown__item, [role='option'], .ant-select-item"
            )
            best_node = None
            best_score = 0.34
            for node in opts:
                try:
                    if not await node.is_visible():
                        continue
                    text = (await node.text_content() or "").strip()
                    sc = semantic_option_score(text, targets)
                    if sc > best_score:
                        best_score = sc
                        best_node = node
                except Exception:
                    continue
            if best_node:
                await best_node.click(timeout=2000)
                return True
    except Exception:
        pass

    return False


async def _fill_select_or_choice(
    page: Page,
    el,
    label: str,
    profile: dict[str, str],
    fallback_value: str | None,
) -> bool:
    pkey = identify_profile_key(label)
    targets: list[str] = []
    if pkey:
        targets = preferred_answers_for_key(pkey, profile)
    if fallback_value:
        targets = [fallback_value, *targets]

    tag = await el.evaluate("el => el.tagName.toLowerCase()")
    input_type = (await el.get_attribute("type") or "text").lower()

    if tag == "select":
        if targets and await _select_by_semantics(el, targets):
            return True
        if fallback_value:
            try:
                await el.select_option(label=fallback_value)
                return True
            except Exception:
                try:
                    await el.select_option(value=fallback_value)
                    return True
                except Exception:
                    return False
        return False

    if input_type in ("radio", "checkbox") or pkey in (
        "education_level",
        "work_visa_status",
        "work_eligible",
        "visa_sponsorship",
        "phone_country_code",
        "title",
    ):
        if targets and await _click_choice_in_group(page, el, label, targets):
            return True

    return False


async def scan_form_profile_keys(session: BrowserSession) -> list[str]:
    """Detect HK-common profile keys present on the current page."""
    assert session.page
    page = session.page
    selectors = (
        "input:not([type=hidden]):not([type=submit]):not([type=button])"
        ":not([type=file]), textarea, select"
    )
    keys: list[str] = []
    elements = await page.query_selector_all(selectors)
    for el in elements:
        try:
            if not await el.is_visible():
                continue
            label = await _field_label(page, el)
            key = identify_profile_key(label)
            if key and key not in keys:
                keys.append(key)
        except Exception:
            continue
    return keys


async def fill_application_form(
    session: BrowserSession,
    form_fields: list[dict[str, str]],
    master_cv: str = "",
    extra_texts: dict[str, str] | None = None,
    profile: dict[str, str] | None = None,
) -> list[str]:
    """
    Fill visible inputs/textareas/selects/radios/checkboxes.
    Never clicks submit/apply buttons.
    Phone: split country code + local number when fields are separate.
    GPA: split score / scale when fields are separate.
    Choices: semantic match for education / visa / sponsorship.
    """
    assert session.page
    page = session.page
    extras = {_norm(k): v for k, v in (extra_texts or {}).items() if v}
    merged_profile = merge_profile(profile)

    filled: list[str] = []
    selectors = (
        "input:not([type=hidden]):not([type=submit]):not([type=button])"
        ":not([type=file]), textarea, select"
    )

    elements = await page.query_selector_all(selectors)
    for el in elements:
        try:
            if not await el.is_visible():
                continue
            disabled = await el.get_attribute("disabled")
            readonly = await el.get_attribute("readonly")
            if disabled is not None or readonly is not None:
                continue

            label = await _field_label(page, el)
            tag = await el.evaluate("el => el.tagName.toLowerCase()")
            input_type = (await el.get_attribute("type") or "text").lower()

            name_attr = _norm(await el.get_attribute("name") or "")
            id_attr = _norm(await el.get_attribute("id") or "")
            if any(
                x in f"{label} {name_attr} {id_attr}"
                for x in ["submit", "申请提交", "确认提交"]
            ):
                continue

            pkey = identify_profile_key(label)
            value = _lookup_value(label, form_fields, extras, merged_profile)

            if not value and tag == "textarea" and (
                "cover" in label or "自述" in label or "求职信" in label
            ):
                value = extras.get("cover letter") or extras.get("自述信")
            if not value and tag == "textarea" and len(label) > 10:
                for k, v in extras.items():
                    if len(k) > 6 and (k in label or label in k):
                        value = v
                        break

            # Choice controls (select / radio / checkbox / custom)
            if tag == "select" or input_type in ("radio", "checkbox"):
                ok = await _fill_select_or_choice(
                    page, el, label, merged_profile, value
                )
                if ok:
                    display = label or name_attr or id_attr or "choice"
                    if display not in filled:
                        filled.append(display[:60])
                    await page.wait_for_timeout(120)
                continue

            # Country-code select often labelled generically — try if phone-ish
            if tag == "select" and pkey == "phone_country_code":
                ok = await _fill_select_or_choice(
                    page, el, label, merged_profile, value
                )
                if ok:
                    filled.append((label or "country code")[:60])
                continue

            if not value:
                # Still try education/visa custom widgets without a text value
                if pkey in (
                    "education_level",
                    "work_visa_status",
                    "work_eligible",
                    "visa_sponsorship",
                    "phone_country_code",
                    "title",
                ):
                    ok = await _fill_select_or_choice(
                        page, el, label, merged_profile, None
                    )
                    if ok:
                        filled.append((label or pkey)[:60])
                continue

            if input_type in (
                "text",
                "email",
                "tel",
                "url",
                "search",
                "number",
            ) or tag == "textarea":
                await _clear_then_fill(el, value)
            else:
                continue

            display = label or name_attr or id_attr or "field"
            if display not in filled:
                filled.append(display[:60])
            await page.wait_for_timeout(120)
        except Exception:
            continue

    # Custom dropdown triggers that are not native <select>
    try:
        combos = await page.query_selector_all(
            '[role="combobox"], .ant-select-selector, .el-select'
        )
        for combo in combos[:12]:
            try:
                if not await combo.is_visible():
                    continue
                label = await _field_label(page, combo)
                pkey = identify_profile_key(label)
                if pkey not in (
                    "education_level",
                    "work_visa_status",
                    "work_eligible",
                    "visa_sponsorship",
                    "phone_country_code",
                    "title",
                    "phone",
                ):
                    continue
                ok = await _fill_select_or_choice(
                    page, combo, label, merged_profile, None
                )
                if ok:
                    filled.append((label or pkey or "combo")[:60])
            except Exception:
                continue
    except Exception:
        pass

    if len(filled) < 2:
        editables = await page.query_selector_all("[contenteditable='true']")
        for el in editables[:3]:
            try:
                if not await el.is_visible():
                    continue
                label = await _field_label(page, el)
                value = _lookup_value(label, form_fields, extras, merged_profile)
                if not value:
                    value = extras.get("cover letter") or (
                        master_cv[:1500] if master_cv else None
                    )
                if not value:
                    continue
                await el.click()
                await page.keyboard.press("Control+A")
                await page.keyboard.press("Backspace")
                await page.keyboard.type(value[:2000], delay=5)
                filled.append((label or "contenteditable")[:60])
            except Exception:
                continue

    return filled


def compute_missing_fields(
    detected_keys: list[str],
    profile_overrides: dict[str, Any] | None,
) -> list[dict[str, str]]:
    profile = merge_profile(profile_overrides)
    return missing_supplement_fields(detected_keys, profile)
