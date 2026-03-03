import { NextResponse } from "next/server";

import { enforceMaxLength, sanitizePlainTextStrict } from "@/lib/text-sanitize";
import { prisma } from "@/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const MAX_FEEDBACK_LENGTH = 4000;

export async function POST(req: Request) {
  const body = (await req.json()) as { message?: unknown; locale?: unknown };
  if (typeof body.message !== "string") {
    return badRequest("Feedback message is required");
  }

  const message = sanitizePlainTextStrict(body.message);
  if (!message) {
    return badRequest("Feedback message is required");
  }
  if (!enforceMaxLength(message, MAX_FEEDBACK_LENGTH)) {
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
