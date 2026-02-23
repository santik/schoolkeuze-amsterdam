import { NextResponse } from "next/server";

import { getSchoolsByIds } from "@/server/schoolsStore";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const schools = await getSchoolsByIds(ids);
  return NextResponse.json({ schools });
}

