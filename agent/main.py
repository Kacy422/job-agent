"""
JobAgent Browser Auto-Apply Service
====================================
Playwright headed Chrome agent:
1) Open apply URL
2) Pause for manual login / captcha
3) Optionally pause for profile supplement (HK common fields)
4) Fill forms from profile + Master CV + Cover Letter
5) NEVER click Submit — leave final click to the user
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from browser_agent import (
    BrowserSession,
    compute_missing_fields,
    fill_application_form,
    scan_form_profile_keys,
)
from profile import merge_profile, profile_to_form_fields

load_dotenv()
load_dotenv("../.env.local")

Phase = Literal[
    "idle",
    "opening",
    "awaiting_login",
    "awaiting_profile",
    "filling",
    "filled",
    "error",
    "stopped",
]


class FormField(BaseModel):
    label: str
    value: str


class OpenQuestion(BaseModel):
    question: str
    answer: str


class StartRequest(BaseModel):
    jobId: str = ""
    applyUrl: str
    masterCv: str = ""
    coverLetter: str = ""
    formFields: list[FormField] = Field(default_factory=list)
    openQuestions: list[OpenQuestion] = Field(default_factory=list)
    whyCompany: str = ""
    whyRole: str = ""
    strengthsAnswer: str = ""
    jobTitle: str = ""
    company: str = ""
    profile: dict[str, Any] = Field(default_factory=dict)


class ProvideProfileRequest(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, str] = Field(default_factory=dict)
    skipMissing: bool = False


class SessionState(BaseModel):
    sessionId: str
    jobId: str = ""
    phase: Phase = "idle"
    message: str = ""
    filledFields: list[str] = Field(default_factory=list)
    missingFields: list[dict[str, str]] = Field(default_factory=list)
    error: str | None = None
    applyUrl: str = ""
    createdAt: str = ""


class SessionBundle:
    def __init__(self, state: SessionState, payload: StartRequest):
        self.state = state
        self.payload = payload
        self.browser: BrowserSession | None = None
        self.lock = asyncio.Lock()
        self.profile_data: dict[str, Any] = dict(payload.profile or {})


app = FastAPI(title="JobAgent Auto-Apply Agent", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS: dict[str, SessionBundle] = {}


@app.get("/")
@app.get("/health")
async def health():
    """Root + /health — used by frontend reconnect / proxy health checks."""
    return {
        "ok": True,
        "status": "online",
        "sessions": len(SESSIONS),
        "service": "JobAgent Auto-Apply Agent",
    }


@app.post("/sessions/start")
async def start_session(body: StartRequest):
    if not body.applyUrl.startswith(("http://", "https://")):
        raise HTTPException(400, "applyUrl 必须是 http/https 链接")

    session_id = str(uuid.uuid4())
    state = SessionState(
        sessionId=session_id,
        jobId=body.jobId,
        phase="opening",
        message="正在启动 Chrome…",
        applyUrl=body.applyUrl,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    bundle = SessionBundle(state, body)
    SESSIONS[session_id] = bundle

    try:
        browser = BrowserSession()
        await browser.start()
        await browser.goto(body.applyUrl)
        bundle.browser = browser
        state.phase = "awaiting_login"
        state.message = (
            "Browser opened. Please complete login / CAPTCHA manually, "
            "then click 「开始填表」."
        )
    except Exception as e:
        state.phase = "error"
        state.error = str(e)
        state.message = f"启动失败：{e}"
        if bundle.browser:
            await bundle.browser.close()
            bundle.browser = None

    return state.model_dump()


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    bundle = SESSIONS.get(session_id)
    if not bundle:
        raise HTTPException(404, "会话不存在")
    return bundle.state.model_dump()


async def _run_fill(bundle: SessionBundle) -> None:
    payload = bundle.payload
    merged = merge_profile(bundle.profile_data)
    profile_fields = profile_to_form_fields(merged)
    # Frontend formFields win on duplicate labels (append profile first)
    form_fields = profile_fields + [
        {"label": f.label, "value": f.value} for f in payload.formFields
    ]

    extra_texts = {
        "cover letter": payload.coverLetter,
        "cover_letter": payload.coverLetter,
        "自述信": payload.coverLetter,
        "求职信": payload.coverLetter,
        "why company": payload.whyCompany,
        "why this company": payload.whyCompany,
        "why role": payload.whyRole,
        "why this role": payload.whyRole,
        "strengths": payload.strengthsAnswer,
        "your strengths": payload.strengthsAnswer,
        "job title": payload.jobTitle,
        "期望职位": payload.jobTitle,
    }
    for q in payload.openQuestions:
        if q.question:
            extra_texts[q.question.lower()] = q.answer

    filled = await fill_application_form(
        bundle.browser,
        form_fields=form_fields,
        master_cv=payload.masterCv,
        extra_texts=extra_texts,
        profile=merged,
    )
    bundle.state.filledFields = filled
    bundle.state.missingFields = []
    bundle.state.phase = "filled"
    bundle.state.message = (
        f"Filled {len(filled)} field(s). Please review the page, then submit manually. "
        "The agent never clicks Submit."
    )


@app.post("/sessions/{session_id}/confirm-login")
async def confirm_login(session_id: str):
    bundle = SESSIONS.get(session_id)
    if not bundle:
        raise HTTPException(404, "会话不存在")
    if not bundle.browser:
        raise HTTPException(400, "浏览器未启动")
    if bundle.state.phase not in ("awaiting_login", "awaiting_profile", "error"):
        raise HTTPException(400, f"当前状态不可填表：{bundle.state.phase}")

    async with bundle.lock:
        bundle.state.error = None
        try:
            detected = await scan_form_profile_keys(bundle.browser)
            missing = compute_missing_fields(detected, bundle.profile_data)
            if missing:
                bundle.state.phase = "awaiting_profile"
                bundle.state.missingFields = missing
                bundle.state.message = (
                    "The form asks for personal details not yet in your profile. "
                    "Please complete the supplement dialog, then continue."
                )
                return bundle.state.model_dump()

            bundle.state.phase = "filling"
            bundle.state.message = "Recognising form fields and filling…"
            await _run_fill(bundle)
        except Exception as e:
            bundle.state.phase = "error"
            bundle.state.error = str(e)
            bundle.state.message = f"填表失败：{e}"

    return bundle.state.model_dump()


@app.post("/sessions/{session_id}/provide-profile")
async def provide_profile(session_id: str, body: ProvideProfileRequest):
    """Receive supplemented profile answers and continue filling."""
    bundle = SESSIONS.get(session_id)
    if not bundle:
        raise HTTPException(404, "会话不存在")
    if not bundle.browser:
        raise HTTPException(400, "浏览器未启动")
    if bundle.state.phase not in ("awaiting_profile", "awaiting_login", "error"):
        raise HTTPException(400, f"当前状态不可补充画像：{bundle.state.phase}")

    async with bundle.lock:
        # Merge answers into session profile
        if body.profile:
            bundle.profile_data.update(body.profile)
        if body.answers:
            key_map = {
                "title": "title",
                "surname": "surname",
                "given_name": "givenName",
                "preferred_name": "preferredName",
                "hkid": "hkid",
                "passport": "passport",
                "work_visa_status": "workVisaStatus",
                "available_date": "availableDate",
                "expected_salary": "expectedSalary",
            }
            extras = dict(bundle.profile_data.get("applyExtras") or {})
            for k, v in body.answers.items():
                val = str(v).strip()
                if not val:
                    continue
                camel = key_map.get(k)
                if camel:
                    bundle.profile_data[camel] = val
                extras[k] = val
                extras[k.replace("_", " ")] = val
            bundle.profile_data["applyExtras"] = extras

        if not body.skipMissing:
            detected = await scan_form_profile_keys(bundle.browser)
            missing = compute_missing_fields(detected, bundle.profile_data)
            # Only block on still-empty answers the user was asked for
            still = [
                m
                for m in missing
                if m["key"] in {x["key"] for x in bundle.state.missingFields}
                and not str(body.answers.get(m["key"], "")).strip()
            ]
            if still and not body.answers:
                bundle.state.missingFields = missing
                bundle.state.phase = "awaiting_profile"
                bundle.state.message = "Please fill the required profile fields."
                return bundle.state.model_dump()

        bundle.state.phase = "filling"
        bundle.state.message = "Profile updated. Filling the form…"
        bundle.state.error = None
        try:
            await _run_fill(bundle)
        except Exception as e:
            bundle.state.phase = "error"
            bundle.state.error = str(e)
            bundle.state.message = f"填表失败：{e}"

    return bundle.state.model_dump()


@app.post("/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    bundle = SESSIONS.get(session_id)
    if not bundle:
        raise HTTPException(404, "会话不存在")
    if bundle.browser:
        await bundle.browser.close()
        bundle.browser = None
    bundle.state.phase = "stopped"
    bundle.state.message = "会话已停止，浏览器已关闭"
    return bundle.state.model_dump()


@app.on_event("shutdown")
async def on_shutdown():
    for bundle in list(SESSIONS.values()):
        if bundle.browser:
            await bundle.browser.close()
            bundle.browser = None
