import { freshness, type DataProvenance } from '@/lib/data-provenance';

const labels = {
  nl: { title:'Data & bronnen', identity:'Adres en contact', enrolment:'Aantal leerlingen', education:'Onderwijsaanbod', results:'Examenresultaten', admissions:'Toelating', missing:'Bron en/of jaar ontbreken; jaarlijkse gegevens worden niet getoond.', stale:'Mogelijk verouderd', verified:'Geverifieerd', automatic:'Automatisch geïmporteerd', manual:'Handmatig geverifieerd' },
  en: { title:'Data & sources', identity:'Address and contact', enrolment:'Student count', education:'School offering', results:'Exam results', admissions:'Admissions', missing:'Source and/or year missing; annual data is not displayed.', stale:'May be outdated', verified:'Verified', automatic:'Automatically imported', manual:'Manually verified' },
};
export function FactSource({provenance, lang}: {provenance?: DataProvenance; lang:'nl'|'en'}) {
  const text = labels[lang];
  if (!provenance) return <span className="text-sm text-zinc-600 dark:text-zinc-400">{text.missing}</span>;
  return <span className="text-sm">
    <a href={provenance.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{provenance.sourceLabel}, {provenance.dataYear}</a>
    {freshness(provenance) === 'stale' && <span className="ml-2 text-amber-800 dark:text-amber-300">⚠ {text.stale}</span>}
  </span>;
}
