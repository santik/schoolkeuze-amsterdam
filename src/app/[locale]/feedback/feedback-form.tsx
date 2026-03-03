"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";

export function FeedbackForm() {
  const t = useTranslations("Feedback");
  const locale = useLocale();
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, locale }),
      });
      const body = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) throw new Error(body?.error ?? "Request failed");
      setIsSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-100">
        {t("thankYou")}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-3xl border border-indigo-100 bg-white/90 p-6 dark:border-indigo-300/20 dark:bg-white/5"
    >
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
          {t("fieldLabel")}
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("placeholder")}
          rows={5}
          className="w-full rounded-2xl border border-indigo-200 bg-white/85 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
        />
      </label>

      {error ? (
        <div className="text-xs text-red-700 dark:text-red-300">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !message.trim()}
        className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-5 text-sm font-bold text-white hover:from-orange-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("sending") : t("send")}
      </button>
    </form>
  );
}
