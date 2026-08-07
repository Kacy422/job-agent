import { NextResponse } from "next/server";

/** @deprecated 请使用 POST /api/parse-job（粘贴 Job URL） */
export async function POST() {
  return NextResponse.json(
    {
      error: "岗位雷达关键词抓取已升级为「岗位 URL 解析」。请使用 POST /api/parse-job。",
      migrateTo: "/api/parse-job",
    },
    { status: 410 }
  );
}
