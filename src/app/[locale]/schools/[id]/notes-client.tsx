"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { useNotes } from "@/lib/useNotes";

export function NotesClient({ schoolId }: { schoolId: string }) {
  const t = useTranslations("Notes");
  const { get, set, hydrated } = useNotes();

  const [draft, setDraft] = React.useState<string>("");
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  const baselineRef = React.useRef<string>("");
  const initializedRef = React.useRef(false);
  const dirtyRef = React.useRef(false);

  React.useEffect(() => {
    if (!hydrated) return;
    const initial = get(schoolId);
    baselineRef.current = initial;
    initializedRef.current = true;
    dirtyRef.current = false;
    setDraft(initial);
    setLastSavedAt(null);
    setIsSaving(false);
    setShowSaved(false);
  }, [get, hydrated, schoolId]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!initializedRef.current) return;
    if (!dirtyRef.current) return;

    if (draft === baselineRef.current) return;

    setIsSaving(true);
    const tSave = window.setTimeout(() => {
      set(schoolId, draft);
      baselineRef.current = draft;
      dirtyRef.current = false;
      const now = Date.now();
      setLastSavedAt(now);
      setIsSaving(false);
      setShowSaved(true);
      window.setTimeout(() => {
        setShowSaved(false);
      }, 1500);
    }, 500);

    return () => {
      window.clearTimeout(tSave);
    };
  }, [draft, hydrated, schoolId, set]);

  if (!hydrated) return null;

  return (
    <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {isSaving
            ? t("saving")
            : showSaved && lastSavedAt
              ? t("autosaved")
              : null}
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(e) => {
          dirtyRef.current = true;
          setDraft(e.target.value);
        }}
        placeholder={t("placeholder")}
        rows={5}
        className="w-full resize-y rounded-2xl border border-black/10 bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:focus:ring-white/15"
      />

    </section>
  );
}
