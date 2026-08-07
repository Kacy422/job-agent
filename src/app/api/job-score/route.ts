import { NextResponse } from "next/server";
import { scoreJdAgainstResume } from "@/lib/score";
import { getDeepSeekKey } from "@/lib/deepseek";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jd = String(body.jd || "").trim();
    const resume = String(body.resume || "").trim();
    const title = String(body.title || "").trim();

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供岗位 JD 与简历内容" },
        { status: 400 }
      );
    }

    const result = await scoreJdAgainstResume(jd, resume, title);
    return NextResponse.json({ ...result, demo: !getDeepSeekKey() });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
