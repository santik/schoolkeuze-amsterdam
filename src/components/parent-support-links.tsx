import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

function SourceLink({ href, isEn, children }: {
  href: string;
  isEn: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {children}{" "}
      <ExternalLink aria-hidden="true" className="inline h-3 w-3 align-baseline" />
      <span className="sr-only">
        {isEn ? " (external link, opens in a new tab)" : " (externe link, opent in een nieuw tabblad)"}
      </span>
    </a>
  );
}

export function ParentSupportLinks({ locale, context }: {
  locale: string;
  context: "capacity" | "non-placement";
}) {
  const isEn = locale === "en";
  return (
    <div
      data-testid={`parent-support-${context}`}
      className="grid gap-2 border-l-2 border-zinc-200 pl-3 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
    >
      {context === "non-placement" && (
        <p>
          <strong>{isEn ? "Official procedure" : "Officiële procedure"}</strong>
          {isEn
            ? ": First check the official ELK/OSVO information for next steps, remaining places and the applicable deadlines: "
            : ": Bekijk eerst de officiële informatie van ELK/OSVO over vervolgstappen, resterende plaatsen en de geldende deadlines: "}
          <SourceLink href="https://www.elkadam.info" isEn={isEn}>
            {isEn ? "ELK information" : "ELK-informatie"}
          </SourceLink>
          {isEn ? " and " : " en "}
          <SourceLink href="https://verenigingosvo.nl" isEn={isEn}>
            {isEn ? "OSVO procedure" : "OSVO-procedure"}
          </SourceLink>.
        </p>
      )}
      <p>
        <strong>{isEn ? "Independent parent support" : "Onafhankelijke ouderondersteuning"}</strong>
        {": "}
        <SourceLink href="http://www.stichtingvsa.nl" isEn={isEn}>Stichting VSA</SourceLink>
        {context === "capacity"
          ? isEn
            ? " is an independent parent organisation offering analysis of historical placement figures and experience with Amsterdam’s matching system."
            : " is een onafhankelijke ouderorganisatie met analyses van historische plaatsingscijfers en ervaring met het Amsterdamse matchingssysteem."
          : isEn
            ? " is an independent parent organisation you can also consult for advice and support after an unfavourable matching result."
            : " is een onafhankelijke ouderorganisatie waar je daarnaast terechtkunt voor advies en ondersteuning na een ongunstige matchinguitslag."}
        {isEn
          ? " VSA does not run the lottery or make official placement decisions."
          : " VSA voert de loting niet uit en neemt geen officiële plaatsingsbesluiten."}
      </p>
    </div>
  );
}
