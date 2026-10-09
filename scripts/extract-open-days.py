#!/usr/bin/env python3
"""Extract the Schoolkeuze 020 open-day calendar into the app's JSON dataset.

The source page (https://schoolkeuze020.nl/open-dagen/) renders every published
open day as a `.scholen-item` block: a date, a school link, a pin/clock/none
detail list and an optional sign-up button. Source school names are mapped onto
our internal names explicitly; an unmapped name raises instead of silently
dropping a school's open days.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_URL = "https://schoolkeuze020.nl/open-dagen/"
SOURCE_LABEL = "Schoolkeuze 020 – open dagen"

DUTCH_MONTHS = {
    "januari": 1,
    "februari": 2,
    "maart": 3,
    "april": 4,
    "mei": 5,
    "juni": 6,
    "juli": 7,
    "augustus": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "december": 12,
}

# Source page name -> name as used in our own school dataset.
SOURCE_TO_INTERNAL = {
    "Cartesius Lyceum": "Het Cartesius",
    "HLW": "Hervormd Lyceum West (HLW)",
    "HLZ": "Hervormd Lyceum Zuid (HLZ)",
    "Kolom praktijkcollege De Atlant": "Kolom Praktijkcollege De Atlant",
    "Kolom praktijkcollege De Dreef": "Kolom Praktijkcollege De Dreef",
    "Kolom praktijkcollege Het Plein": "Kolom Praktijkcollege Het Plein",
    "Kolom praktijkcollege Noord": "Kolom Praktijkcollege Noord",
    "Spinoza Lyceum": "Spinoza Lyceum Amsterdam",
    "TASC (Tech Amsterdam Scholen Collectief)": "TASC",
    "VONK": "Vonk Amsterdam",
}

# Words that mark a location note as prose rather than a bare address, so it
# needs an English rendering instead of being shown as-is.
DUTCH_LOCATION_MARKERS = re.compile(
    r"\b(hoofdgebouw|hoofdlocatie|dependance|nevenvestiging|locatie|gebouw|ingang|"
    r"tijdelijk|leerjaar|brugklas)\w*\b",
    re.IGNORECASE,
)

DISTRICTS = {
    "Centrum",
    "Noord",
    "Oost",
    "West",
    "Zuid",
    "Zuidoost",
    "Nieuw-West",
    "Weesp",
}


def school_key(school: dict) -> str:
    explicit = school.get("sourceKey")
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip().lower()
    brin = str(school.get("brin") or "no-brin").strip().lower()
    slug = re.sub(r"\W+", "-", school["name"].lower(), flags=re.ASCII)
    return f"sample:{brin}:{slug}"


def clean(text: str) -> str:
    text = html.unescape(re.sub(r"(?s)<[^>]+>", " ", text))
    text = unicodedata.normalize("NFC", text).replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def parse_dutch_date(text: str) -> date:
    match = re.fullmatch(r"(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})", text)
    if not match:
        raise ValueError(f"Unparsable open-day date: {text!r}")
    month = DUTCH_MONTHS.get(match.group(2).lower())
    if month is None:
        raise ValueError(f"Unknown Dutch month in date: {text!r}")
    return date(int(match.group(3)), month, int(match.group(1)))


def split_location(text: str) -> tuple[str | None, str | None]:
    """'Noord (Meeuwenlaan 136)' -> ('Noord', 'Meeuwenlaan 136')."""
    match = re.fullmatch(r"(.*?)\s*\((.*)\)\s*", text)
    if not match:
        return (text or None), None
    district = match.group(1).strip() or None
    if district and district not in DISTRICTS:
        raise ValueError(f"Unexpected district: {district!r} (from {text!r})")
    return district, match.group(2).strip() or None


def parse_items(page_html: str) -> list[dict]:
    start = page_html.find('<div class="scholen-list">')
    if start == -1:
        raise ValueError("Could not find the open-day list container")
    blocks = re.findall(
        r'<div class="scholen-item\b.*?(?=<div class="scholen-item\b|\Z)',
        page_html[start:],
        re.S,
    )
    if not blocks:
        raise ValueError("Open-day list container held no items")

    events: list[dict] = []
    for block in blocks:
        name_match = re.search(r"<h3>\s*<a href=\"([^\"]+)\">\s*(.*?)\s*</a>", block, re.S)
        date_match = re.search(r'<div class="scholen-date">(.*?)</div>', block, re.S)
        if not name_match or not date_match:
            raise ValueError(f"Open-day item is missing a school or date: {block[:200]!r}")

        details = re.findall(
            r'<li[^>]*>\s*<div class="school-icon icon--(\w+)"></div>\s*'
            r'<div class="school-detail">\s*(.*?)\s*</div>',
            block,
            re.S,
        )
        by_icon: dict[str, list[str]] = {}
        for icon, raw in details:
            value = clean(raw)
            if value:
                by_icon.setdefault(icon, []).append(value)

        location = " ".join(by_icon.get("pin", []))
        district, location_note = split_location(location) if location else (None, None)
        signup = re.search(
            r'<div class="scholen-button">\s*<a href="([^"]+)"', block, re.S
        )

        start_time, end_time, time_note = parse_time(
            " ".join(by_icon.get("clock", [])) or None
        )
        events.append(
            {
                "sourceName": clean(name_match.group(2)),
                "sourcePageUrl": html.unescape(name_match.group(1)),
                "date": parse_dutch_date(clean(date_match.group(1))).isoformat(),
                "startTime": start_time,
                "endTime": end_time,
                "timeNote": time_note,
                "description": " ".join(by_icon.get("none", [])) or None,
                "district": district,
                "locationNote": location_note,
                "signupUrl": html.unescape(signup.group(1)) if signup else None,
            }
        )
    return events


TIME_RANGE = re.compile(
    r"^(\d{1,2})[.:](\d{2})\s*(?:uur)?\s*(?:-|–|—|tot|t/m)\s*(\d{1,2})[.:](\d{2})\s*(?:uur)?$",
    re.IGNORECASE,
)
SINGLE_TIME = re.compile(r"^(\d{1,2})[.:](\d{2})\s*(?:uur)?$", re.IGNORECASE)


def parse_time(text: str | None) -> tuple[str | None, str | None, str | None]:
    """Return (startTime, endTime, timeNote).

    The source types times by hand, so only unambiguous ranges become machine
    readable fields. Anything else ("10.00 en 12.30 uur", "12:45 inloop - start
    13:00 uur") is kept verbatim as a note rather than guessed at.
    """
    if not text:
        return None, None, None
    cleaned = text.strip()
    match = TIME_RANGE.match(cleaned)
    if match:
        hours = [int(match.group(1)), int(match.group(3))]
        minutes = [int(match.group(2)), int(match.group(4))]
        if all(0 <= h < 24 for h in hours) and all(0 <= m < 60 for m in minutes):
            return f"{hours[0]:02d}:{minutes[0]:02d}", f"{hours[1]:02d}:{minutes[1]:02d}", None
    match = SINGLE_TIME.match(cleaned)
    if match and 0 <= int(match.group(1)) < 24 and 0 <= int(match.group(2)) < 60:
        return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}", None, None
    return None, None, cleaned


def translate(
    text: str | None,
    table: dict[str, str],
    missing: set[str],
    *,
    required: bool,
) -> dict[str, str] | None:
    """Pair a Dutch source string with its English rendering."""
    if not text:
        return None
    english = table.get(text)
    if english is None:
        if required:
            missing.add(text)
        return {"nl": text, "en": text}
    return {"nl": text, "en": english}


def fetch(url: str) -> str:
    request = Request(url, headers={"User-Agent": "amsterdam-schoolkeuze-ingest/1.0"})
    with urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", errors="replace")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--html",
        type=Path,
        help="Parse a saved copy of the open-day page instead of fetching it.",
    )
    parser.add_argument("--schools", type=Path, default=root / "data/schools.sample.json")
    parser.add_argument(
        "--translations", type=Path, default=root / "data/open-day-translations.json"
    )
    parser.add_argument("--out", type=Path, default=root / "data/school-open-days.json")
    parser.add_argument(
        "--report", type=Path, default=root / "data/school-open-days.report.json"
    )
    args = parser.parse_args()

    page_html = args.html.read_text(encoding="utf-8") if args.html else fetch(SOURCE_URL)
    events = parse_items(page_html)

    schools = json.loads(args.schools.read_text(encoding="utf-8"))
    by_name = {school["name"]: school for school in schools}

    translations = json.loads(args.translations.read_text(encoding="utf-8"))
    description_table: dict[str, str] = translations["descriptions"]
    location_table: dict[str, str] = translations["locationNotes"]
    time_note_table: dict[str, str] = translations["timeNotes"]
    missing_translations: set[str] = set()

    grouped: dict[str, dict] = {}
    unmatched: dict[str, int] = {}
    aliases: dict[str, set[str]] = {}

    for event in events:
        source_name = event.pop("sourceName")
        internal = SOURCE_TO_INTERNAL.get(source_name, source_name)
        school = by_name.get(internal)
        if school is None:
            unmatched[source_name] = unmatched.get(source_name, 0) + 1
            continue
        aliases.setdefault(internal, set()).add(source_name)
        event["description"] = translate(
            event["description"], description_table, missing_translations, required=True
        )
        event["timeNote"] = translate(
            event["timeNote"], time_note_table, missing_translations, required=True
        )
        event["locationNote"] = translate(
            event["locationNote"],
            location_table,
            missing_translations,
            required=bool(
                event["locationNote"]
                and DUTCH_LOCATION_MARKERS.search(event["locationNote"])
            ),
        )
        key = school_key(school)
        entry = grouped.setdefault(
            key,
            {"name": school["name"], "sourcePageUrl": event["sourcePageUrl"], "openDays": []},
        )
        event.pop("sourcePageUrl")
        entry["openDays"].append(event)

    if unmatched:
        raise ValueError(f"Unmapped open-day schools: {sorted(unmatched)}")
    if missing_translations:
        listed = "\n  ".join(sorted(missing_translations))
        raise ValueError(
            "Missing English translations in "
            f"{args.translations.name}; add them and re-run:\n  {listed}"
        )

    for entry in grouped.values():
        entry["openDays"].sort(key=lambda day: (day["date"], day["startTime"] or ""))

    dates = [day["date"] for entry in grouped.values() for day in entry["openDays"]]
    season_start = min(dates)
    season_end = max(dates)

    dataset = {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": {
            "sourceLabel": SOURCE_LABEL,
            "sourceUrl": SOURCE_URL,
            "firstDate": season_start,
            "lastDate": season_end,
        },
        "schools": dict(sorted(grouped.items())),
    }

    report = {
        "generatedAt": dataset["generatedAt"],
        "totalOpenDays": len(dates),
        "schoolsWithOpenDays": len(grouped),
        "schoolsWithoutOpenDays": sorted(
            school["name"] for school in schools if school_key(school) not in grouped
        ),
        "renamedSourceNames": {
            name: sorted(found)
            for name, found in sorted(aliases.items())
            if found != {name}
        },
        "openDaysWithoutTime": [
            {"school": entry["name"], "date": day["date"]}
            for entry in grouped.values()
            for day in entry["openDays"]
            if not day["startTime"] and not day["timeNote"]
        ],
        "openDaysWithUnparsedTime": [
            {"school": entry["name"], "date": day["date"], "timeNote": day["timeNote"]["nl"]}
            for entry in grouped.values()
            for day in entry["openDays"]
            if day["timeNote"]
        ],
        "unusedTranslations": sorted(
            set(description_table)
            - {
                day["description"]["nl"]
                for entry in grouped.values()
                for day in entry["openDays"]
                if day["description"]
            }
        ),
        "openDaysWithoutSignupUrl": [
            {"school": entry["name"], "date": day["date"]}
            for entry in grouped.values()
            for day in entry["openDays"]
            if not day["signupUrl"]
        ],
    }

    args.out.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    out = args.out
    label = out.relative_to(root) if out.is_relative_to(root) else out
    print(
        f"{report['totalOpenDays']} open days for {report['schoolsWithOpenDays']} schools "
        f"({season_start} … {season_end}) -> {label}"
    )


if __name__ == "__main__":
    main()
