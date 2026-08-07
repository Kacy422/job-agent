import { NextResponse } from "next/server";
import { callDeepSeek, extractJson } from "@/lib/deepseek";
import type { ApplyPack } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resume = String(body.resume || "").trim();
    const jobTitle = String(body.jobTitle || "目标岗位").trim();
    const company = String(body.company || "目标公司").trim();

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供岗位 JD 与简历" },
        { status: 400 }
      );
    }

    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content:
              'You are an expert at Hong Kong online job applications (MNC / local ATS). Output STRICT JSON: {"coverLetter":"full Cover Letter","whyCompany":"...","whyRole":"...","strengthsAnswer":"...","openQuestions":[{"question":"common open question","answer":"draft answer"}],"formFields":[{"label":"field label","value":"paste-ready value"}]}. MANDATORY: coverLetter, whyCompany, whyRole, strengthsAnswer, and EVERY openQuestions.answer MUST be high-quality Business English for the Hong Kong job market — no Chinese. openQuestions at least 3 items (e.g. challenge, career plan, why this company). formFields at least: Title, Surname, Given Name, Preferred Name, Full Name, Email, Phone, City, Job Title, Education summary, Experience summary — English labels/values preferred. Never invent facts not in the resume.',
          },
          {
            role: "user",
            content: `岗位：${jobTitle}\n公司：${company}\n\n【JD】\n${jd.slice(0, 6000)}\n\n【简历】\n${resume.slice(0, 6000)}`,
          },
        ],
        { json: true, temperature: 0.5 }
      );

      const parsed = extractJson<ApplyPack>(content);
      return NextResponse.json(normalizePack(parsed, jobTitle, company, resume));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "MISSING_API_KEY") {
        return NextResponse.json(fallbackApply(jobTitle, company, resume));
      }
      console.error(err);
      return NextResponse.json(fallbackApply(jobTitle, company, resume));
    }
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}

function normalizePack(
  parsed: ApplyPack,
  jobTitle: string,
  company: string,
  resume: string
): ApplyPack {
  const fb = fallbackApply(jobTitle, company, resume);
  return {
    coverLetter: parsed.coverLetter || fb.coverLetter,
    whyCompany: parsed.whyCompany || fb.whyCompany,
    whyRole: parsed.whyRole || fb.whyRole,
    strengthsAnswer: parsed.strengthsAnswer || fb.strengthsAnswer,
    openQuestions:
      Array.isArray(parsed.openQuestions) && parsed.openQuestions.length > 0
        ? parsed.openQuestions
        : fb.openQuestions,
    formFields:
      Array.isArray(parsed.formFields) && parsed.formFields.length > 0
        ? parsed.formFields
        : fb.formFields,
  };
}

function fallbackApply(
  jobTitle: string,
  company: string,
  resume: string
): ApplyPack {
  const emailMatch = resume.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = resume.match(/\+?\d[\d\s-]{7,}\d/);
  const nameMatch = resume.match(/^#\s*([^\n|]+)/m);

  return {
    coverLetter: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}. My academic background and internship experience align closely with the responsibilities outlined in the job description, and I would welcome the opportunity to contribute to your team in Hong Kong.\n\nThank you for your consideration.\n\nYours sincerely,\nWU XUELIAN, KACY`,
    whyCompany: `I am drawn to ${company} because of its relevance to my sustainability and ESG-focused experience, and I hope to contribute in a professional Hong Kong working environment.`,
    whyRole: `The ${jobTitle} role matches my education and internship path. I aim to deepen my professional capability and deliver measurable impact.`,
    strengthsAnswer:
      "Fast learning, structured communication, data sensitivity, and hands-on project delivery in sustainability / ESG contexts.",
    openQuestions: [
      {
        question: "Describe a time you overcame a challenge",
        answer:
          "During an internship I handled multi-source unstructured data by standardising cleaning steps and automating routines, improving processing efficiency by about 40% and delivering on time.",
      },
      {
        question: "What are your career plans?",
        answer: `In the near term I aim to grow in a ${jobTitle} role; medium term I hope to lead projects independently with strong stakeholder communication.`,
      },
      {
        question: "Why do you want to join our company?",
        answer: `${company}'s business direction aligns with my background, and I want to create value in real professional settings in Hong Kong.`,
      },
    ],
    formFields: [
      { label: "Title", value: "Ms." },
      { label: "Surname", value: "Wu" },
      { label: "Given Name", value: "Xuelian" },
      { label: "Preferred Name", value: "Kacy" },
      { label: "Full Name", value: (nameMatch?.[1] || "WU XUELIAN, KACY").split("|")[0].trim() },
      { label: "Email", value: emailMatch?.[0] || "wuxuelian25@126.com" },
      { label: "Phone", value: phoneMatch?.[0] || "+852 65733452" },
      { label: "City", value: "Hong Kong" },
      { label: "Job Title", value: jobTitle },
      { label: "Work Visa Status", value: "IANG" },
      {
        label: "Education summary",
        value:
          "The University of Hong Kong — MSc in Sustainable Environmental Design; Southwest University — B.Eng. in Landscape Architecture",
      },
      {
        label: "Experience summary",
        value:
          "Crossroads Foundation (Engagement Intern); Chongqing Urban Greening Management Center (Landscape Architect Intern)",
      },
    ],
  };
}
