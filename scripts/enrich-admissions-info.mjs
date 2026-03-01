import fs from 'node:fs/promises';
import path from 'node:path';

function hasLevel(levels, level) {
  return Array.isArray(levels) && levels.includes(level);
}

function hasAnyVmbo(levels) {
  return Array.isArray(levels) && levels.some((lvl) => String(lvl).startsWith('VMBO'));
}

function buildAdmissionsInfo({ name, websiteUrl, levels }) {
  const schoolSpecificNl = [];
  const schoolSpecificEn = [];

  const isPraktijk = hasLevel(levels, 'PRAKTIJKONDERWIJS');
  const isVsoLike = /vso|orion|signis|visio|kentalis/i.test(name);
  const offersVwo = hasLevel(levels, 'VWO');
  const offersHavo = hasLevel(levels, 'HAVO');
  const offersVmbo = hasAnyVmbo(levels);

  if (isPraktijk) {
    schoolSpecificNl.push(`${name}: praktijkonderwijs werkt met een oriëntatie/intake vóór de centrale aanmeldweek; alleen als de school je plaatsbaar vindt kun je daar aanmelden.`);
    schoolSpecificEn.push(`${name}: practical education uses an orientation/intake phase before the central application week; you can only apply if the school confirms you are placeable.`);
  } else if (isVsoLike) {
    schoolSpecificNl.push(`${name}: deze route valt vaak (deels) buiten de standaard centrale loting & matching. Controleer de aparte toelatingsroute van de school en het samenwerkingsverband.`);
    schoolSpecificEn.push(`${name}: this route is often (partly) outside the standard central lottery & matching process. Check the school's separate admission route and regional support process.`);
  } else {
    schoolSpecificNl.push(`${name}: aanmelding loopt via de Amsterdamse centrale loting & matching in het ELK-ouderportaal.`);
    schoolSpecificEn.push(`${name}: application runs through Amsterdam's central lottery & matching process in the ELK parent portal.`);
  }

  if (offersVwo && !offersHavo && !offersVmbo && !isPraktijk) {
    schoolSpecificNl.push('Deze school biedt alleen vwo-routes; je hebt dus een passend (vwo-)advies nodig.');
    schoolSpecificEn.push('This school only offers vwo tracks, so a matching vwo-level recommendation is required.');
  }

  if ((offersHavo || offersVmbo) && !isPraktijk) {
    schoolSpecificNl.push('Bij overaanmelding op een niveau/profielklas bepaalt loting & matching de plaatsing op basis van voorrang en lotnummer.');
    schoolSpecificEn.push('If a level/profile class is oversubscribed, placement is determined by lottery & matching using priority rules and lottery number.');
  }

  schoolSpecificNl.push('Controleer altijd de groep-8/aanmeldpagina van de school voor exacte voorrangsregels, profielklassen en beschikbare capaciteit van dit jaar.');
  schoolSpecificEn.push('Always verify the school\'s group-8/admissions page for exact priority rules, profile classes, and this year\'s capacity.');

  const sources = [
    { label: 'Schoolkeuze020 - De overstap', url: 'https://schoolkeuze020.nl/de-overstap/' },
    { label: 'Schoolkeuze020 - Centrale aanmeldweek', url: 'https://schoolkeuze020.nl/centrale-aanmeldweek/' },
    { label: 'Schoolkeuze020 - Praktijkonderwijs/KOVO', url: 'https://schoolkeuze020.nl/aanmelding-voor-praktijkonderwijs-of-kovo/' },
    { label: 'OSVO', url: 'https://www.osvo.nl' },
  ];

  if (websiteUrl) {
    sources.unshift({ label: `${name} - school website`, url: websiteUrl });
  }

  return {
    nl: {
      summary: 'Amsterdam gebruikt een centrale loting & matching voor de overstap naar het voortgezet onderwijs, met uitzonderingen voor sommige routes (zoals praktijkonderwijs/kovo en delen van vso).',
      timeline: [
        'Uiterlijk 24 maart 2026: definitief basisschooladvies.',
        '25 t/m 31 maart 2026: centrale aanmeldweek (1e ronde).',
        '9 april 2026: uitslag centrale loting & matching (1e ronde).',
      ],
      schoolSpecific: schoolSpecificNl,
      notes: [
        'Na de uitslag volgt een 2e ronde voor leerlingen zonder plaatsing of bij terugtrekking.',
        'Hardheidsclausule loopt via het centrale OSVO-loket.',
      ],
    },
    en: {
      summary: 'Amsterdam uses a central lottery & matching process for secondary-school admissions, with exceptions for some routes (such as practical education/kovo and parts of special education).',
      timeline: [
        'By March 24, 2026: final primary-school recommendation.',
        'March 25-31, 2026: central application week (round 1).',
        'April 9, 2026: round-1 lottery & matching results.',
      ],
      schoolSpecific: schoolSpecificEn,
      notes: [
        'After round 1, a second round is available for students without placement or after withdrawal.',
        'Hardship requests go through the central OSVO desk.',
      ],
    },
    sources,
  };
}

function normalizeLevel(v) {
  const key = String(v).toUpperCase().trim().replaceAll('-', '_');
  if (key === 'VMBO_TL') return 'VMBO_T';
  if (key === 'PRAKTIJK') return 'PRAKTIJKONDERWIJS';
  return key;
}

const filePath = path.join(process.cwd(), 'data', 'schools.sample.json');
const raw = await fs.readFile(filePath, 'utf8');
const schools = JSON.parse(raw);
const next = schools.map((s) => {
  const levels = (s.levels ?? []).map(normalizeLevel);
  return {
    ...s,
    admissionsInfo: buildAdmissionsInfo({
      name: s.name,
      websiteUrl: s.websiteUrl ?? null,
      levels,
    }),
  };
});
await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Updated admissionsInfo for ${next.length} schools`);
