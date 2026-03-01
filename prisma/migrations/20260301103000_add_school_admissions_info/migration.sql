ALTER TABLE "School"
ADD COLUMN "admissionsInfo" JSONB;

UPDATE "School"
SET "admissionsInfo" = jsonb_build_object(
  'nl',
  jsonb_build_object(
    'summary',
    'Amsterdam gebruikt een centrale loting & matching voor de overstap naar het voortgezet onderwijs, met uitzonderingen voor sommige routes (zoals praktijkonderwijs/kovo en delen van vso).',
    'timeline',
    jsonb_build_array(
      'Uiterlijk 24 maart 2026: definitief basisschooladvies.',
      '25 t/m 31 maart 2026: centrale aanmeldweek (1e ronde).',
      '9 april 2026: uitslag centrale loting & matching (1e ronde).'
    ),
    'schoolSpecific',
    jsonb_build_array(
      concat("name", ': aanmelding loopt via de Amsterdamse centrale loting & matching in het ELK-ouderportaal.'),
      'Controleer altijd de groep-8/aanmeldpagina van de school voor exacte voorrangsregels, profielklassen en beschikbare capaciteit van dit jaar.'
    ),
    'notes',
    jsonb_build_array(
      'Na de uitslag volgt een 2e ronde voor leerlingen zonder plaatsing of bij terugtrekking.',
      'Hardheidsclausule loopt via het centrale OSVO-loket.'
    )
  ),
  'en',
  jsonb_build_object(
    'summary',
    'Amsterdam uses a central lottery & matching process for secondary-school admissions, with exceptions for some routes (such as practical education/kovo and parts of special education).',
    'timeline',
    jsonb_build_array(
      'By March 24, 2026: final primary-school recommendation.',
      'March 25-31, 2026: central application week (round 1).',
      'April 9, 2026: round-1 lottery & matching results.'
    ),
    'schoolSpecific',
    jsonb_build_array(
      concat("name", ': application runs through Amsterdam''s central lottery & matching process in the ELK parent portal.'),
      'Always verify the school''s group-8/admissions page for exact priority rules, profile classes, and this year''s capacity.'
    ),
    'notes',
    jsonb_build_array(
      'After round 1, a second round is available for students without placement or after withdrawal.',
      'Hardship requests go through the central OSVO desk.'
    )
  ),
  'sources',
  CASE
    WHEN "websiteUrl" IS NOT NULL
      THEN jsonb_build_array(
        jsonb_build_object('label', concat("name", ' - school website'), 'url', "websiteUrl"),
        jsonb_build_object('label', 'Schoolkeuze020 - De overstap', 'url', 'https://schoolkeuze020.nl/de-overstap/'),
        jsonb_build_object('label', 'Schoolkeuze020 - Centrale aanmeldweek', 'url', 'https://schoolkeuze020.nl/centrale-aanmeldweek/'),
        jsonb_build_object('label', 'Schoolkeuze020 - Praktijkonderwijs/KOVO', 'url', 'https://schoolkeuze020.nl/aanmelding-voor-praktijkonderwijs-of-kovo/'),
        jsonb_build_object('label', 'OSVO', 'url', 'https://www.osvo.nl')
      )
    ELSE jsonb_build_array(
      jsonb_build_object('label', 'Schoolkeuze020 - De overstap', 'url', 'https://schoolkeuze020.nl/de-overstap/'),
      jsonb_build_object('label', 'Schoolkeuze020 - Centrale aanmeldweek', 'url', 'https://schoolkeuze020.nl/centrale-aanmeldweek/'),
      jsonb_build_object('label', 'Schoolkeuze020 - Praktijkonderwijs/KOVO', 'url', 'https://schoolkeuze020.nl/aanmelding-voor-praktijkonderwijs-of-kovo/'),
      jsonb_build_object('label', 'OSVO', 'url', 'https://www.osvo.nl')
    )
  END
)
WHERE "admissionsInfo" IS NULL;
