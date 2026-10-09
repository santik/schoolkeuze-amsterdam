import { CalendarDays, ExternalLink } from "lucide-react";

import {
  formatOpenDayDate,
  formatOpenDayTime,
  localized,
  openDayLocale,
  type OpenDay,
  type OpenDaysSource,
} from "@/lib/open-days";

function OpenDayRow({ day, locale }: { day: OpenDay; locale: string }) {
  const lang = openDayLocale(locale);
  const isEn = lang === "en";
  const time = formatOpenDayTime(day, lang);
  const description = localized(day.description, lang);
  const locationNote = localized(day.locationNote, lang);

  return (
    <li
      data-testid="open-day"
      data-date={day.date}
      className="grid gap-1 border-b border-black/5 py-3 last:border-0 dark:border-white/5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {formatOpenDayDate(day.date, locale)}
        </span>
        {time ? (
          <span className="text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{time}</span>
        ) : null}
      </div>
      {description ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{description}</p>
      ) : null}
      {locationNote ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">{isEn ? "Location" : "Locatie"}:</span> {locationNote}
        </p>
      ) : null}
      {day.signupUrl ? (
        <p className="text-sm">
          <a
            href={day.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            data-testid="open-day-signup"
          >
            {isEn
              ? "Details and sign-up on the school website"
              : "Details en aanmelden op de schoolwebsite"}{" "}
            <ExternalLink aria-hidden="true" className="inline h-3 w-3 align-baseline" />
            <span className="sr-only">
              {isEn
                ? " (external link, opens in a new tab)"
                : " (externe link, opent in een nieuw tabblad)"}
            </span>
          </a>
        </p>
      ) : null}
    </li>
  );
}

export function OpenDaysSection({
  locale,
  upcoming,
  pastCount,
  source,
}: {
  locale: string;
  upcoming: OpenDay[];
  pastCount: number;
  source: OpenDaysSource;
}) {
  const isEn = openDayLocale(locale) === "en";

  return (
    <section
      data-testid="open-days"
      className="grid gap-4 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5"
    >
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CalendarDays aria-hidden="true" className="h-5 w-5" />
          {isEn ? "Open days" : "Open dagen"}
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {isEn
            ? "Open days, information evenings and taster-lesson afternoons for this school. Some events require signing up in advance, and schools do change or cancel dates — always confirm on the school's own website before you go."
            : "Open dagen, informatieavonden en lesjesmiddagen van deze school. Voor sommige activiteiten moet je je vooraf aanmelden, en scholen wijzigen of annuleren data — controleer altijd de website van de school zelf voordat je gaat."}
        </p>
      </div>

      {upcoming.length > 0 ? (
        <ul className="grid">
          {upcoming.map((day, index) => (
            <OpenDayRow key={`${day.date}:${day.startTime ?? index}`} day={day} locale={locale} />
          ))}
        </ul>
      ) : (
        <p data-testid="open-days-empty" className="text-sm text-zinc-700 dark:text-zinc-300">
          {pastCount > 0
            ? isEn
              ? "All known open days for this school have already taken place. Check the school's own website for new dates."
              : "Alle bekende open dagen van deze school zijn al geweest. Kijk op de website van de school zelf voor nieuwe data."
            : isEn
              ? "No open days are known for this school. Check the school's own website — not every school announces its dates in advance."
              : "Voor deze school zijn geen open dagen bekend. Kijk op de website van de school zelf — niet elke school kondigt haar data vooraf aan."}
        </p>
      )}

      <p data-testid="open-days-range" className="text-xs text-zinc-600 dark:text-zinc-400">
        {isEn
          ? `Dates known for ${formatOpenDayDate(source.firstDate, locale)} to ${formatOpenDayDate(source.lastDate, locale)}.`
          : `Bekende data van ${formatOpenDayDate(source.firstDate, locale)} tot ${formatOpenDayDate(source.lastDate, locale)}.`}
      </p>
    </section>
  );
}
