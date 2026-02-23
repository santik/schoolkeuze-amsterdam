import { NextResponse } from "next/server";

import { getSchoolById } from "@/server/schoolsStore";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ school });
}

