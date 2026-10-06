#!/usr/bin/env python3
"""Extract checked OSVO capacity/matching tables into the app's JSON dataset.

The PDFs use merged cells and visual grouping. Capacity rows are parsed by
column coordinates. Matching rows are parsed from the numeric table and assigned
to explicitly reviewed school groups in page order. If the source layout changes,
row-count assertions fail instead of silently attaching figures to another school.
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
    "https://verenigingosvo.nl/wp-content/uploads/2026/02/"
    "Loting-en-Matching-2025-Verslag.pdf"
)


SOURCE_TO_INTERNAL = {
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
}


# PDF page number -> (internal school name, number of department rows).
# Repeated names represent separately published profile/capacity groups.
MATCHING_GROUPS = {
    49: [
        ("ALASCA", 2), ("ABC Noorderlicht", 1), ("Barlaeus Gymnasium", 1),
        ("Berlage Lyceum", 3), ("Berlage Lyceum", 1), (None, 2),
        ("Bindelmeer College", 1), ("Bredero", 1), ("Calandlyceum", 1),
        ("Calandlyceum", 1), ("Calandlyceum", 3), ("Calvijn College Amsterdam", 1),
        ("Het Cartesius", 2), ("Het Cartesius", 2), ("Cburg College", 1),
        ("College De Meer", 1), ("College De Meer", 2), ("College ZUYD", 1),
        ("College ZUYD", 3), ("Comenius Lyceum Amsterdam", 3),
    ],
    50: [
        ("Cornelius Haga Lyceum", 3), ("CSB", 2), ("Cygnus Gymnasium", 1),
        ("Damstede Lyceum", 2), ("De Amsterdamse MAVO", 1), ("DENISE", 3),
        ("Fiducie College", 2), ("Fons Vitae Lyceum", 2), ("Futuris", 1),
        ("Geert Groote College Amsterdam", 3), ("Gerrit van der Veen College", 1),
        ("Gerrit van der Veen College", 2), ("Havo De Hof", 1),
        ("Hervormd Lyceum West (HLW)", 3), ("Hervormd Lyceum West (HLW)", 1),
        ("Het 4e Gymnasium", 1), ("Het Amsterdams Lyceum", 1),
        ("Hervormd Lyceum Zuid (HLZ)", 2), ("Hubertus & Berkhoff", 1),
        ("Hubertus & Berkhoff", 2), ("Huygens College", 1),
        ("Hyperion Lyceum", 1), ("St. Ignatiusgymnasium", 1),
    ],
    51: [
        ("Ir. Lely Lyceum", 3), ("IVKO", 1), ("IVKO", 2),
        ("Joodse Scholengemeenschap Maimonides", 1), ("Kairos College", 3),
        ("Kiem Montessori", 2), ("Lumion", 3), ("Marcanti College", 5),
        ("Mediacollege Amsterdam", 3), ("Metis Montessori Lyceum", 2),
        ("Metis Montessori Lyceum", 2), ("Metropolis Lyceum", 3),
        ("Montessori Lyceum Amsterdam (MLA)", 1),
        ("Montessori Lyceum Amsterdam (MLA)", 3),
    ],
    52: [
        ("Montessori Lyceum Oostpoort", 2), ("Montessori Lyceum Pax", 3),
        ("Montessori Lyceum Terra Nova", 5), ("Mundus College", 3),
        ("OSB Amsterdam", 5), ("Over-Y College", 1), ("Over-Y College", 1),
        ("Pieter Nieuwland College", 1), ("Pieter Nieuwland College", 2),
        ("Spinoza Lyceum Amsterdam", 1), ("Spinoza Lyceum Amsterdam", 1),
        ("Spinoza Lyceum Amsterdam", 3), ("Spinoza20first", 1),
        ("Spring High", 1), ("St. Nicolaaslyceum", 2),
        ("St. Nicolaaslyceum", 2), ("Sweelinck College", 1),
    ],
    53: [
        ("TASC", 3), ("Vinse School", 3), ("Vonk Amsterdam", 1),
        ("Vossius Gymnasium", 1), ("Xplore Agora", 3),
        ("Yuverta vmbo en pro Amsterdam-Oost", 1),
        ("Yuverta vmbo Amsterdam-West", 2),
    ],
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


def extract_department(page, row) -> str:
    text = page.crop((84, row.bbox[1], 137, row.bbox[3])).extract_text(
        x_tolerance=1, y_tolerance=1
    )
    return " ".join((text or "").split())


def extract_matching(path: Path, known_names: set[str]):
    schools: dict[str, list[dict]] = {}
    with pdfplumber.open(path) as pdf:
        for pdf_page_number, groups in MATCHING_GROUPS.items():
            page = pdf.pages[pdf_page_number - 1]
            table = page.find_tables()[0]
            values = table.extract()[2:]
            rows = table.rows[2:]
            expected = sum(row_count for _, row_count in groups)
            if len(rows) != expected or len(values) != expected:
                raise ValueError(
                    f"OSVO page {pdf_page_number}: expected {expected} rows, "
                    f"found {len(rows)} geometry rows and {len(values)} value rows"
                )

            offset = 0
            for school_name, row_count in groups:
                if school_name is not None and school_name not in known_names:
                    raise ValueError(f"Unknown internal school mapping: {school_name}")
                for index in range(offset, offset + row_count):
                    raw = list(values[index])
                    if len(raw) == 20:
                        raw.pop(6)  # blank spacer column on the final pages
                    if len(raw) != 19:
                        raise ValueError(
                            f"OSVO page {pdf_page_number}, row {index}: expected 19 values, found {len(raw)}"
                        )
                    if school_name is None:
                        continue
                    department = extract_department(page, rows[index])
                    if not department:
                        raise ValueError(
                            f"OSVO page {pdf_page_number}, row {index}: missing department"
                        )
                    schools.setdefault(school_name, []).append(
                        {
                            "department": department,
                            "capacity": to_int(raw[5]),
                            "firstPreferences": to_int(raw[6]),
                            "secondPreferences": to_int(raw[7]),
                            "thirdPreferences": to_int(raw[8]),
                            "totalPlaced": to_int(raw[14]),
                            "placedFirstPreference": to_int(raw[15]),
                            "placedSecondPreference": to_int(raw[16]),
                            "placedThirdPreference": to_int(raw[17]),
                            "placedOtherPreference": to_int(raw[18]),
                        }
                    )
                offset += row_count
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
        "generatedAt": "2026-10-02T00:00:00.000Z",
        "capacity": {
            "academicYear": "2026-2027",
            "status": "preliminary",
            "sourceLabel": "OSVO preliminary capacity 2026",
            "sourceUrl": CAPACITY_SOURCE_URL,
        },
        "matching": {
            "academicYear": "2025-2026",
            "status": "final",
            "sourceLabel": "OSVO Loting en Matching 2025 report",
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
    missing_values = []
    for name, rows in matching.items():
        for index, row in enumerate(rows):
            missing = [
                field
                for field, value in row.items()
                if field != "department" and value is None
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
