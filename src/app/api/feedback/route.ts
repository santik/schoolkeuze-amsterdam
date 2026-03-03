import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { message?: unknown; locale?: unknown };
  if (typeof body.message !== "string" || !body.message.trim()) {
    return badRequest("Feedback message is required");
  }

  const message = body.message.trim();
  if (message.length > 4000) {
    return badRequest("Feedback message is too long");
  }

  const locale =
    typeof body.locale === "string" && body.locale.trim().length > 0
      ? body.locale.trim().slice(0, 10)
      : null;

  await prisma.feedback.create({
    data: {
      message,
      locale,
    },
  });

  return NextResponse.json({ ok: true });
}
