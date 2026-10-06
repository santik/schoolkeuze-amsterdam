import type { SchoolLevel } from "@prisma/client";
import admissionsPriority from "@/lib/admissions-priority.json";

type SourceLink = { label: string; url: string };

export type AdmissionsInfo = {
  nl: {
    summary: string;
    timeline: string[];
    schoolSpecific: string[];
    notes: string[];
  };
  en: {
    summary: string;
    timeline: string[];
    schoolSpecific: string[];
    notes: string[];
  };
  sources: SourceLink[];
};

type BuildParams = {
  name: string;
  websiteUrl?: string | null;
  levels?: SchoolLevel[];
};

function hasLevel(levels: SchoolLevel[] | undefined, level: SchoolLevel) {
  return Boolean(levels?.includes(level));
}

function hasAnyVmbo(levels: SchoolLevel[] | undefined) {
  if (!levels || levels.length === 0) return false;
  return levels.some((lvl) => String(lvl).startsWith("VMBO"));
}

function hasKovo(levels: SchoolLevel[] | undefined, name: string) {
  return Boolean(
    levels?.some((level) => String(level).toUpperCase() === "KOVO") ||
      /\bkovo\b|special classes/i.test(name)
  );
}

export function buildAdmissionsInfo({
  name,
  websiteUrl,
  levels,
}: BuildParams): AdmissionsInfo {
  const schoolSpecificNl: string[] = [];
  const schoolSpecificEn: string[] = [];

  const isPraktijk = hasLevel(levels, "PRAKTIJKONDERWIJS");
  const isVsoLike =
    hasLevel(levels, "VSO") || /vso|orion|signis|visio|kentalis|viertaal/i.test(name);
  const isKovo = hasKovo(levels, name);
  const offersVwo = hasLevel(levels, "VWO");
  const offersHavo = hasLevel(levels, "HAVO");
  const offersVmbo = hasAnyVmbo(levels);

  if (isPraktijk) {
    schoolSpecificNl.push(
      `${name}: praktijkonderwijs doet niet mee aan de Centrale Loting & Matching. Eerst is er een oriëntatie- en intakefase; alleen na een positieve plaatsbaarheidsbeoordeling kan digitaal worden aangemeld tijdens de centrale aanmeldweek.`
    );
    schoolSpecificEn.push(
      `${name}: practical education does not take part in Central Lottery & Matching. There is first an orientation and intake phase; online application in the central application week is possible only after the school confirms that it can offer a suitable place.`
    );
  } else if (isVsoLike) {
    schoolSpecificNl.push(
      `${name}: voortgezet speciaal onderwijs doet niet mee aan de Centrale Loting & Matching. Bespreek plaatsing vroeg met de basisschool, deze school en het Samenwerkingsverband VO Amsterdam-Diemen.`
    );
    schoolSpecificEn.push(
      `${name}: secondary special education does not take part in Central Lottery & Matching. Discuss placement early with the primary school, this school, and the Amsterdam-Diemen regional support partnership.`
    );
  } else if (isKovo) {
    schoolSpecificNl.push(
      `${name}: kleinschalig ondersteunend voortgezet onderwijs (kovo) doet niet mee aan de Centrale Loting & Matching. De oriëntatiefase gaat vooraf aan de digitale aanmelding in de centrale aanmeldweek.`
    );
    schoolSpecificEn.push(
      `${name}: small-scale supportive secondary education (kovo) does not take part in Central Lottery & Matching. Its orientation phase takes place before the online application during the central application week.`
    );
  } else {
    schoolSpecificNl.push(
      `${name}: aanmelding loopt via de Amsterdamse centrale loting & matching in het ELK-ouderportaal.`
    );
    schoolSpecificEn.push(
      `${name}: application runs through Amsterdam's central lottery & matching process in the ELK parent portal.`
    );
  }

  if (offersVwo && !offersHavo && !offersVmbo && !isPraktijk) {
    schoolSpecificNl.push(
      "Deze school biedt alleen vwo-routes; je hebt dus een passend (vwo-)advies nodig."
    );
    schoolSpecificEn.push(
      "This school only offers vwo tracks, so a matching vwo-level recommendation is required."
    );
  }

  schoolSpecificNl.push(
    "Controleer de groep-8/aanmeldpagina van de school voor intake, voorselectie, profielklassen en capaciteit. Deze gegevens bevestigen geen afzonderlijke voorrangsregel zonder bron voor de specifieke capaciteitsgroep."
  );
  schoolSpecificEn.push(
    "Check the school's group-8/admissions page for intake, preselection, profile classes, and capacity. This information does not establish a separate priority rule without a source for the specific capacity group."
  );

  const sources: SourceLink[] = [
    {
      label: "Schoolkeuze020 - De overstap",
      url: "https://schoolkeuze020.nl/de-overstap/",
    },
    {
      label: "Schoolkeuze020 - Centrale aanmeldweek",
      url: "https://schoolkeuze020.nl/centrale-aanmeldweek/",
    },
    {
      label: "Schoolkeuze020 - Praktijkonderwijs/KOVO",
      url: "https://schoolkeuze020.nl/aanmelding-voor-praktijkonderwijs-of-kovo/",
    },
    {
      label: "ELKadam - Kernprocedure 2025-2026 (timeline)",
      url: "https://www.elkadam.info/sites/default/files/2026-01/bijlage_1_tijdpad_kernprocedure_po-vo_2025-2026_1.pdf",
    },
    {
      label: `${admissionsPriority.annualProcedureLabel} (priority rules)`,
      url: admissionsPriority.annualProcedureUrl,
    },
    {
      label: "OSVO",
      url: "https://www.osvo.nl",
    },
  ];

  if (websiteUrl) {
    sources.unshift({
      label: `${name} - school website`,
      url: websiteUrl,
    });
  }

  return {
    nl: {
      summary:
        "In schooljaar 2025-2026 gebruikt Amsterdam Centrale Loting & Matching voor regulier voortgezet onderwijs. Praktijkonderwijs, kovo en voortgezet speciaal onderwijs volgen een aparte route.",
      timeline: [
        "Uiterlijk 24 maart 2026: definitief basisschooladvies.",
        "25 t/m 31 maart 2026: centrale aanmeldweek (1e ronde).",
        "9 april 2026: uitslag centrale loting & matching (1e ronde).",
        "9 april 16:00 t/m 14 april 16:00: aanmelden voor de 2e ronde; uitslag op 15 april vanaf 15:30 uur.",
      ],
      schoolSpecific: schoolSpecificNl,
      notes: [
        "Uiterlijk 12 mei 2026 beslist de middelbare school over toelating, ook wanneer een ondersteuningsvraag verdere beoordeling vraagt.",
        "Hardheidsclausule loopt via het centrale OSVO-loket.",
      ],
    },
    en: {
      summary:
        "In school year 2025-2026, Amsterdam uses Central Lottery & Matching for mainstream secondary education. Practical education, kovo, and secondary special education use separate routes.",
      timeline: [
        "By March 24, 2026: final primary-school recommendation.",
        "March 25-31, 2026: central application week (round 1).",
        "April 9, 2026: round-1 lottery & matching results.",
        "April 9, 16:00 to April 14, 16:00: round-2 applications; results on April 15 from 15:30.",
      ],
      schoolSpecific: schoolSpecificEn,
      notes: [
        "By May 12, 2026, the secondary school decides on admission, including when a support need requires further assessment.",
        "Hardship requests go through the central OSVO desk.",
      ],
    },
    sources,
  };
}
