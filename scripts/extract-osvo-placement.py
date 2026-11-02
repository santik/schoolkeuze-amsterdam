#!/usr/bin/env python3
"""Extract checked OSVO capacity/matching tables into the app's JSON dataset.

Capacity rows come from the preliminary capacity PDF and are parsed by column
coordinates. Matching rows come from the Loting & Matching report's per-afdeling
overview table (TABEL 18). That table wraps school names across several lines and
pdfplumber detects a different number of spacer columns per page, so names and
departments are read from the detected table cells while the numeric values are
read by column x-coordinate; the two are aligned by asserting their department
sequences are identical. If the source layout changes, those assertions fail
instead of silently attaching figures to another school.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pdfplumber


CAPACITY_SOURCE_URL = (
    "https://verenigingosvo.nl/wp-content/uploads/2025/12/"
    "Voorlopige-capaciteitsopgave-2026-1.pdf"
)
MATCHING_SOURCE_URL = (
    "https://verenigingosvo.nl/wp-content/uploads/2026/04/"
    "Verslag-Loting-en-Matching-2026.pdf"
)

# TABEL 18 "Overzicht per afdeling" spans these pages in the 2026 report.
MATCHING_PAGES = [39, 40, 41, 42]
# A marker on the first matching page, asserted so a re-paginated report fails loud.
MATCHING_PAGE_MARKER = "CAPACITEIT, VOORKEUREN EN PLAATSINGEN"

# Left x0 bound of each numeric column in TABEL 18 (right-aligned numbers). The
# five capacity and five placement columns are annual series; only the 2026
# columns are kept. Demand is published for the first preference only.
MATCHING_NUM_COLUMNS = [
    ("cap22", 190), ("cap23", 214), ("cap24", 238), ("cap25", 262), ("cap26", 286),
    ("vk1", 322),
    ("pl22", 358), ("pl23", 384), ("pl24", 407), ("pl25", 430), ("pl26", 453),
    ("nv1", 478), ("nv2", 498), ("nv3", 517), ("nv4", 536),
]
MATCHING_NUM_BOUNDS = [lo for _, lo in MATCHING_NUM_COLUMNS] + [562]
MATCHING_NUM_NAMES = [name for name, _ in MATCHING_NUM_COLUMNS]
DEPARTMENT_RE = re.compile(r"^(vwo|v\.a\.|havo|vmbo)", re.IGNORECASE)


SOURCE_TO_INTERNAL = {
    # Capacity PDF aliases.
    "Alasca": "ALASCA",
    "Amsterdams Beroepscollege Noorderlicht": "ABC Noorderlicht",
    "AB Noorderlicht": "ABC Noorderlicht",
    "Berlage Lyceum - Tweetalig": "Berlage Lyceum",
    "Calvijn College": "Calvijn College Amsterdam",
    "Cygnus gymnasium": "Cygnus Gymnasium",
    "Damstede": "Damstede Lyceum",
    "Damstede Lyceum": "Damstede Lyceum",
    "Havo de Hof": "Havo De Hof",
    "HLZ (Hervormd Lyceum Zuid)": "Hervormd Lyceum Zuid (HLZ)",
    "Hervormd Lyceum Zuid": "Hervormd Lyceum Zuid (HLZ)",
    "Ignatiusgymnasium": "St. Ignatiusgymnasium",
    "Kairos Tienercollege": "Kairos College",
    "Cartesius Amsterdam": "Het Cartesius",
    "Cartesius Lyceum": "Het Cartesius",
    "OSB": "OSB Amsterdam",
    "Over-Y": "Over-Y College",
    "VONK": "Vonk Amsterdam",
    "Xplore": "Xplore Agora",
    "Yuverta VMBO Amsterdam Oost": "Yuverta vmbo en pro Amsterdam-Oost",
    "Yuverta VMBO Amsterdam West": "Yuverta vmbo Amsterdam-West",
    "Spinoza Lyceum": "Spinoza Lyceum Amsterdam",
    "Hervormd Lyceum West": "Hervormd Lyceum West (HLW)",
    "Montessori Lyceum Amsterdam": "Montessori Lyceum Amsterdam (MLA)",
    "Geert Groote College": "Geert Groote College Amsterdam",
    "VONK Amsterdam": "Vonk Amsterdam",
    # Matching report (TABEL 18) profile-class variants that fold into one school.
    "Berlage Lyceum - tto": "Berlage Lyceum",
    "Berlage Lyceum - My World Class": "Berlage Lyceum",
    "Bindelmeer College - Havo- potentie": "Bindelmeer College",
    "Calandlyceum - Technasium": "Calandlyceum",
    "Calandlyceum - Topsport": "Calandlyceum",
    "Cartesius Lyceum - Het Lyceum": "Het Cartesius",
    "College de Meer": "College De Meer",
    "College de Meer Havo potentie": "College De Meer",
    "College ZUYD - Havo- potentie": "College ZUYD",
    "College ZUYD - Talentendanskla": "College ZUYD",
    "Gerrit van der Veen College - DaMu": "Gerrit van der Veen College",
    "Hervormd Lyceum West - Digi Tech/tto": "Hervormd Lyceum West (HLW)",
    "Hubertus & Berkhoff - tto": "Hubertus & Berkhoff",
    "Ir. Lely Lyceum - Technasium": "Ir. Lely Lyceum",
    "IVKO DAMU": "IVKO",
    "Metis Mont. Lyceum": "Metis Montessori Lyceum",
    "Montessori Lyceum Amsterdam - Gymnasium": "Montessori Lyceum Amsterdam (MLA)",
    "Over-Y - Sportklas": "Over-Y College",
    "Pieter Nieuwland College - Plus": "Pieter Nieuwland College",
    "Spinoza Lyceum - Gymnasium": "Spinoza Lyceum Amsterdam",
    "Spinoza Lyceum - Muziekplus": "Spinoza Lyceum Amsterdam",
    "St. Nicolaaslyceum - tto": "St. Nicolaaslyceum",
    "Sweelinck College - Havo- potentie": "Sweelinck College",
}


def internal_name(source_name: str, known_names: set[str]) -> str | None:
    if source_name == "Bernard Nieuwentijt College (Monnickendam)":
        return None
    candidate = SOURCE_TO_INTERNAL.get(source_name, source_name)
    if candidate not in known_names:
        raise ValueError(f"Unmapped OSVO school: {source_name!r} -> {candidate!r}")
    return candidate


def school_key(school: dict) -> str:
    explicit = school.get("sourceKey")
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip().lower()
    brin = str(school.get("brin") or "no-brin").strip().lower()
    slug = re.sub(r"\W+", "-", school["name"].lower(), flags=re.ASCII)
    return f"sample:{brin}:{slug}"


def group_words_by_line(page):
    lines: dict[float, list[dict]] = {}
    for word in page.extract_words():
        lines.setdefault(round(word["top"], 1), []).append(word)
    return [sorted(words, key=lambda word: word["x0"]) for _, words in sorted(lines.items())]


def extract_capacity(path: Path, known_names: set[str]):
    schools: dict[str, list[dict]] = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for words in group_words_by_line(page):
                preselection = " ".join(w["text"] for w in words if w["x0"] >= 490)
                data = " ".join(w["text"] for w in words if 240 <= w["x0"] < 490)
                match = re.match(r"^(\d+)\s*(.+)$", data)
                if not match or preselection not in {"Ja", "Nee"}:
                    continue
                source_name = " ".join(w["text"] for w in words if w["x0"] < 165)
                name = internal_name(source_name, known_names)
                if name is None:
                    continue
                profile = " ".join(w["text"] for w in words if 165 <= w["x0"] < 240)
                pathways = [part.strip() for part in match.group(2).split(",") if part.strip()]
                schools.setdefault(name, []).append(
                    {
                        "profile": profile or None,
                        "capacity": int(match.group(1)),
                        "pathways": pathways,
                        "preselection": preselection == "Ja",
                    }
                )
    return schools


def to_int(value: str | None) -> int | None:
    value = (value or "").strip()
    return int(value) if value.isdigit() else None


def _norm(text: str | None) -> str:
    return " ".join((text or "").split())


def _repair_name(text: str | None) -> str:
    # pdfplumber occasionally splits a word on kerning, e.g. "Kairos C ollege".
    return re.sub(r"\bC ollege\b", "College", _norm(text))


def _num_column(x0: float) -> str | None:
    for index in range(len(MATCHING_NUM_COLUMNS)):
        if MATCHING_NUM_BOUNDS[index] <= x0 < MATCHING_NUM_BOUNDS[index + 1]:
            return MATCHING_NUM_NAMES[index]
    return None


def _matching_numbers(page):
    """Per department row (keyed by the department label), the numeric cells
    bucketed by column x-coordinate. Returns rows in top-to-bottom order."""
    rows = []
    for words in group_words_by_line(page):
        department = _norm(" ".join(w["text"] for w in words if 133 <= w["x0"] < 190))
        if not DEPARTMENT_RE.match(department):
            continue
        buckets: dict[str, list[tuple[float, str]]] = {}
        for word in words:
            column = _num_column(word["x0"])
            if column:
                buckets.setdefault(column, []).append((word["x0"], word["text"]))
        values = {
            column: "".join(text for _, text in sorted(cells))
            for column, cells in buckets.items()
        }
        rows.append((department, values))
    return rows


def _matching_names(page):
    """Per department row, the (school name, department) from the detected table
    cells, where wrapped names are joined. Returns rows in table order."""
    rows = []
    for cells in page.find_tables()[0].extract():
        department = _norm(cells[1]) if len(cells) > 1 else ""
        if not DEPARTMENT_RE.match(department):
            continue
        rows.append((_repair_name(cells[0]), department))
    return rows


def extract_matching(path: Path, known_names: set[str]):
    schools: dict[str, list[dict]] = {}
    with pdfplumber.open(path) as pdf:
        marker = pdf.pages[MATCHING_PAGES[0] - 1].extract_text() or ""
        if MATCHING_PAGE_MARKER not in marker:
            raise ValueError(
                f"OSVO matching page {MATCHING_PAGES[0]} is missing the TABEL 18 marker"
            )
        current_source: str | None = None
        for page_number in MATCHING_PAGES:
            page = pdf.pages[page_number - 1]
            numbers = _matching_numbers(page)
            names = _matching_names(page)
            if len(numbers) != len(names):
                raise ValueError(
                    f"OSVO page {page_number}: {len(numbers)} numeric rows vs "
                    f"{len(names)} named rows"
                )
            for (dept_a, values), (source_name, dept_b) in zip(numbers, names):
                if dept_a != dept_b:
                    raise ValueError(
                        f"OSVO page {page_number}: department mismatch "
                        f"{dept_a!r} vs {dept_b!r}"
                    )
                if source_name:
                    current_source = source_name
                if current_source is None:
                    raise ValueError(
                        f"OSVO page {page_number}: department {dept_a!r} has no school"
                    )
                name = internal_name(current_source, known_names)
                if name is None:
                    continue
                schools.setdefault(name, []).append(
                    {
                        "department": dept_a,
                        "capacity": to_int(values.get("cap26")),
                        "firstPreferences": to_int(values.get("vk1")),
                        # The 2026 report publishes demand for the first preference only.
                        "secondPreferences": None,
                        "thirdPreferences": None,
                        "totalPlaced": to_int(values.get("pl26")),
                        "placedFirstPreference": to_int(values.get("nv1")),
                        "placedSecondPreference": to_int(values.get("nv2")),
                        "placedThirdPreference": to_int(values.get("nv3")),
                        "placedOtherPreference": to_int(values.get("nv4")),
                    }
                )
    return schools


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--capacity-pdf", type=Path, required=True)
    parser.add_argument("--matching-pdf", type=Path, required=True)
    parser.add_argument("--schools", type=Path, default=Path("data/schools.sample.json"))
    parser.add_argument("--output", type=Path, default=Path("data/school-placement-history.json"))
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("data/school-placement-history.report.json"),
    )
    args = parser.parse_args()

    school_records = json.loads(args.schools.read_text())
    keys_by_name = {school["name"]: school_key(school) for school in school_records}
    if len(set(keys_by_name.values())) != len(keys_by_name):
        raise ValueError("Duplicate stable school keys in internal school data")
    known_names = set(keys_by_name)
    capacity = extract_capacity(args.capacity_pdf, known_names)
    matching = extract_matching(args.matching_pdf, known_names)

    names = sorted(set(capacity) | set(matching))
    dataset = {
        "generatedAt": "2026-11-02T00:00:00.000Z",
        "capacity": {
            "academicYear": "2026-2027",
            "status": "preliminary",
            "sourceLabel": "OSVO preliminary capacity 2026",
            "sourceUrl": CAPACITY_SOURCE_URL,
        },
        "matching": {
            "academicYear": "2026-2027",
            "status": "final",
            "sourceLabel": "OSVO Loting en Matching 2026 report",
            "sourceUrl": MATCHING_SOURCE_URL,
        },
        "schools": {
            keys_by_name[name]: {
                "capacityGroups": capacity.get(name, []),
                "matchingGroups": matching.get(name, []),
            }
            for name in names
        },
    }
    args.output.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n")

    duplicate_aliases = {}
    for source_name, target_name in SOURCE_TO_INTERNAL.items():
        duplicate_aliases.setdefault(target_name, []).append(source_name)
    duplicate_aliases = {
        target: aliases
        for target, aliases in duplicate_aliases.items()
        if len(aliases) > 1
    }
    # Demand beyond the first preference is not published per afdeling in 2026.
    unpublished_fields = {"secondPreferences", "thirdPreferences"}
    missing_values = []
    for name, rows in matching.items():
        for index, row in enumerate(rows):
            missing = [
                field
                for field, value in row.items()
                if field != "department" and field not in unpublished_fields and value is None
            ]
            if missing:
                missing_values.append(
                    {"schoolKey": keys_by_name[name], "row": index, "fields": missing}
                )
    suspicious_changes = []
    for name in sorted(set(capacity) & set(matching)):
        current = sum(row["capacity"] for row in capacity[name])
        previous_values = [row["capacity"] for row in matching[name] if row["capacity"] is not None]
        previous = sum(previous_values)
        if previous and abs(current - previous) / previous >= 0.25:
            suspicious_changes.append(
                {
                    "schoolKey": keys_by_name[name],
                    "previousCapacity": previous,
                    "currentCapacity": current,
                    "changePercent": round((current - previous) / previous * 100, 1),
                    "reviewNote": "Capacity groups can differ between publications; verify manually.",
                }
            )
    report = {
        "generatedAt": dataset["generatedAt"],
        "unmatchedSourceNames": [],
        "duplicateMappings": duplicate_aliases,
        "schoolsWithoutCapacity": [keys_by_name[name] for name in sorted(set(matching) - set(capacity))],
        "schoolsWithoutMatching": [keys_by_name[name] for name in sorted(set(capacity) - set(matching))],
        "missingValues": missing_values,
        "suspiciousCapacityChanges": suspicious_changes,
        "counts": {
            "schools": len(names),
            "capacityRows": sum(map(len, capacity.values())),
            "matchingRows": sum(map(len, matching.values())),
        },
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(
        f"Wrote {args.output} and {args.report}: {len(names)} schools, "
        f"{sum(map(len, capacity.values()))} capacity rows, "
        f"{sum(map(len, matching.values()))} matching rows"
    )


if __name__ == "__main__":
    main()
