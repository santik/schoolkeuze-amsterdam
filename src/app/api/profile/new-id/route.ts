import { NextResponse } from "next/server";

import { generateProfileId } from "@/server/profile-id-generator";

export async function GET() {
  const id = generateProfileId();
  return NextResponse.json({ id });
}

