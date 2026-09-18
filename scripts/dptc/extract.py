#!/usr/bin/env python3
"""
DPTC course extractor.

Reads the 13 DPTC_*.pptx decks in ../../DPTC/, classifies every slide, pulls the
hidden notes-based answer keys, and writes a single reviewable manifest to
scripts/dptc/dptc-course.generated.json.

Run command (from repo root, using the local venv created for this script):

    scripts/dptc/.venv/bin/python3 scripts/dptc/extract.py

(venv was created with: python3 -m venv scripts/dptc/.venv && \
    scripts/dptc/.venv/bin/pip install python-pptx)

See /home/vahalla/.cursor/plans/dptc_course_import_script_bc8e6cfa.plan.md for the
full design rationale (why slug "dptc" is avoided, why content lives only in the
`main` field, etc). This file implements the "Content mapping algorithm" from the
accompanying task prompt.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Optional

from pptx import Presentation

REPO_ROOT = Path(__file__).resolve().parents[2]
DPTC_DIR = REPO_ROOT / "DPTC"
OUT_PATH = Path(__file__).resolve().parent / "dptc-course.generated.json"

DECK_FILES = [
    "DPTC_00_Introductory_Module.pptx",
    "DPTC_01_Drug_Use_Situation_Nigeria.pptx",
    "DPTC_02_Supply_Reduction.pptx",
    "DPTC_03_Demand_and_Harm_Reduction.pptx",
    "DPTC_04_Drugs_Effects_Dependency.pptx",
    "DPTC_05_Causes_of_Drug_Use_and_Stigma.pptx",
    "DPTC_06_Types_of_Drug_Treatment.pptx",
    "DPTC_07_Special_Populations.pptx",
    "DPTC_08_Drug_Screening_ASSIST.pptx",
    "DPTC_09_Advocacy.pptx",
    "DPTC_10_Family_Interventions.pptx",
    "DPTC_11_Human_Rights.pptx",
    "DPTC_12_Issues_for_Law_Enforcement.pptx",
]

# ---------------------------------------------------------------------------
# Slide-heading classification
# ---------------------------------------------------------------------------

# Exact (post-normalize) bold-run text that identifies a slide's type. Also
# reused, more narrowly, as the "badge junk" strip set below.
CLASSIFY_EXACT = {
    "PRE-TEST": "PRETEST",
    "POST-TEST": "POST_TEST",
    "KNOWLEDGE CHECK": "KNOWLEDGE_CHECK",
    "CASE STUDY": "CASE_STUDY",
    "MODULE COMPLETE": "MODULE_COMPLETE",
    "LEARNING OBJECTIVES": "OBJECTIVES",
    "ADDITIONAL READINGS & RESOURCES": "READINGS",
    "KEY POINTS OF THIS MODULE": "KEY_POINTS",
}

# Small on-slide "badge" tags (and the generic type-label headings themselves)
# that should never end up as lesson/quiz body content once we've used them
# for classification.
STRIP_SET = {
    "OBJECTIVES",
    "READINGS",
    "SUMMARY",
    "CASE STUDY",
    "KNOWLEDGE CHECK",
    "PRE-TEST",
    "POST-TEST",
    "MODULE COMPLETE",
}

FOOTER_PREFIX = "KADSAMHSA Learning Management System"


def normalize(text: str) -> str:
    """Upper-case + strip a trailing ' N' or ' N/M' badge-counter suffix."""
    t = text.strip()
    t = re.sub(r"\s+\d+(/\d+)?$", "", t)
    return t.strip().upper()


def para_text(para) -> str:
    return "".join(r.text for r in para.runs)


def para_is_bold(para) -> bool:
    return any(bool(r.font.bold) for r in para.runs)


def raw_paragraphs(slide):
    """All (text, bold) pairs across every text-frame shape, in shape/paragraph
    order, skipping empty paragraphs and the repeated footer line."""
    out = []
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for para in shape.text_frame.paragraphs:
            text = para_text(para)
            if not text.strip():
                continue
            if text.strip().startswith(FOOTER_PREFIX):
                continue
            out.append((text, para_is_bold(para)))
    return out


def clean_paragraphs(slide):
    """raw_paragraphs() with badge/type-label junk stripped out too."""
    return [
        (text, bold)
        for (text, bold) in raw_paragraphs(slide)
        if normalize(text) not in STRIP_SET
    ]


def classify_slide(slide, index: int) -> str:
    if index == 0:
        return "TITLE"
    for text, bold in raw_paragraphs(slide):
        if not bold:
            continue
        norm = normalize(text)
        if norm in CLASSIFY_EXACT:
            return CLASSIFY_EXACT[norm]
    return "TOPIC"


def notes_text(slide) -> str:
    if not slide.has_notes_slide:
        return ""
    return slide.notes_slide.notes_text_frame.text or ""


# ---------------------------------------------------------------------------
# Generic "one lesson per slide" body builder (TOPIC / OBJECTIVES / CASE_STUDY
# / READINGS / KEY_POINTS)
# ---------------------------------------------------------------------------


def is_label_line(text: str, bold: bool) -> bool:
    stripped = text.strip()
    if not bold:
        return False
    if stripped.isdigit():
        return False
    if len(stripped) > 80:
        return False
    if "." in stripped:
        return False
    return True


def build_generic_title_and_body(slide) -> tuple[str, str]:
    paras = clean_paragraphs(slide)
    if not paras:
        return "Untitled", ""

    title = paras[0][0].strip()
    rest = paras[1:]

    blocks: list[dict] = []
    current: dict = {"label": None, "lines": []}
    pending_number: Optional[str] = None

    def flush():
        nonlocal current
        if current["label"] or current["lines"]:
            blocks.append(current)
        current = {"label": None, "lines": []}

    for text, bold in rest:
        stripped = text.strip()
        if bold and stripped.isdigit():
            pending_number = stripped
            continue
        if pending_number is not None:
            current["lines"].append(f"{pending_number}. {stripped}")
            pending_number = None
            continue
        if is_label_line(text, bold):
            flush()
            current["label"] = stripped
            continue
        current["lines"].append(stripped)
    flush()

    parts = []
    for block in blocks:
        if block["label"]:
            parts.append(block["label"])
            parts.append("\n".join(block["lines"]))
        elif block["lines"]:
            parts.append("\n".join(block["lines"]))
    main = "\n\n".join(p for p in parts if p.strip())
    return title, main


# ---------------------------------------------------------------------------
# TITLE slide (slide 1 of every deck)
# ---------------------------------------------------------------------------


def extract_title_slide(slide) -> tuple[str, str, str]:
    """Returns (module_title, lesson_main, course_description).

    Every deck's title slide has a fixed run order once the generic
    "KADSAMHSA LEARNING MANAGEMENT SYSTEM" banner and the "MODULE N" /
    "INTRODUCTORY MODULE" badge are removed:
      [0] course-level description (repeats on every deck)
      [1] specific module/lesson title (bold, white)
      [2] module-specific one-line tagline
      [3+] adaptation credit line(s)

    course_description is only meaningfully used once (from module 0) to
    help write the course-level summary."""
    module_badge_pattern = re.compile(r"^(MODULE \d+|INTRODUCTORY MODULE)$", re.IGNORECASE)

    filtered = []
    for text, _bold in raw_paragraphs(slide):
        stripped = text.strip()
        if stripped == "KADSAMHSA LEARNING MANAGEMENT SYSTEM":
            continue
        if module_badge_pattern.match(stripped):
            continue
        filtered.append(stripped)

    course_description = filtered[0] if len(filtered) > 0 else ""
    title = filtered[1] if len(filtered) > 1 else "Introduction"
    body_lines = filtered[2:]
    main = "\n".join(line for line in body_lines if line)
    return title, main, course_description


# ---------------------------------------------------------------------------
# PRE-TEST / POST-TEST question extraction (3 slides each => 5 questions)
# ---------------------------------------------------------------------------

Q_STEM_RE = re.compile(r"^Q(\d+)\.\s*(.*)$")
OPTION_RE = re.compile(r"^([A-D])\.\s+(.*)$")
ANSWER_KEY_LINE_RE = re.compile(r"^Q(\d+):\s*([A-D])(?:\s*[—-]\s*(.*))?$")
LETTER_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}


def parse_answer_key(notes: str) -> dict[int, tuple[str, str]]:
    """Parses lines like 'Q1: C' or 'Q1: B — rationale...' -> {1: ('C', '')}"""
    out: dict[int, tuple[str, str]] = {}
    for line in notes.splitlines():
        m = ANSWER_KEY_LINE_RE.match(line.strip())
        if m:
            qnum = int(m.group(1))
            letter = m.group(2)
            rationale = (m.group(3) or "").strip()
            out[qnum] = (letter, rationale)
    return out


def extract_test_questions(slides) -> list[dict]:
    """slides: list of 3 python-pptx slide objects (PRE-TEST or POST-TEST)."""
    questions: dict[int, dict] = {}
    answer_key: dict[int, tuple[str, str]] = {}

    for slide in slides:
        answer_key.update(parse_answer_key(notes_text(slide)))
        current: Optional[dict] = None
        for text, bold in clean_paragraphs(slide):
            stripped = text.strip()
            m = Q_STEM_RE.match(stripped)
            if m and bold:
                qnum = int(m.group(1))
                current = {"number": qnum, "stem": m.group(2).strip(), "options": []}
                questions[qnum] = current
                continue
            m = OPTION_RE.match(stripped)
            if m and current is not None:
                current["options"].append(m.group(2).strip())
                continue
            # instructional line ("Answer before/after studying...") - ignore
    ordered = [questions[n] for n in sorted(questions.keys())]
    for q in ordered:
        letter, rationale = answer_key.get(q["number"], (None, ""))
        q["correctIndex"] = LETTER_INDEX.get(letter, 0) if letter else 0
        q["rationale"] = rationale
    return ordered


# ---------------------------------------------------------------------------
# KNOWLEDGE CHECK extraction (1 slide)
# ---------------------------------------------------------------------------

KC_ANSWER_RE = re.compile(r"KNOWLEDGE CHECK ANSWER \(LMS\):\s*([A-D])(?:\s*[—-]\s*(.*))?", re.IGNORECASE)


def extract_knowledge_check(slide) -> dict:
    stem = ""
    options: list[str] = []
    for text, bold in clean_paragraphs(slide):
        stripped = text.strip()
        m = OPTION_RE.match(stripped)
        if m:
            options.append(m.group(2).strip())
            continue
        if not stem and bold:
            stem = stripped
            continue
        # ignore instructional lines etc.

    letter, rationale = None, ""
    m = KC_ANSWER_RE.search(notes_text(slide))
    if m:
        letter = m.group(1)
        rationale = (m.group(2) or "").strip()

    return {
        "stem": stem,
        "options": options,
        "correctIndex": LETTER_INDEX.get(letter, 0) if letter else 0,
        "letter": letter or "A",
        "rationale": rationale,
    }


# ---------------------------------------------------------------------------
# Word-count based reading-time estimates
# ---------------------------------------------------------------------------


def reading_minutes(text: str) -> int:
    words = len(text.split())
    return max(1, round(words / 200))


def duration_label_for(text: str) -> str:
    return f"{reading_minutes(text)} min read"


def slugify(text: str, max_len: int = 60) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:max_len].strip("-") or "section"


# ---------------------------------------------------------------------------
# Per-module extraction
# ---------------------------------------------------------------------------


def extract_module(path: Path, position: int) -> dict:
    prs = Presentation(str(path))
    slides = list(prs.slides)
    classifications = [classify_slide(slide, i) for i, slide in enumerate(slides)]

    module_slug = f"module-{position}"

    lessons: list[dict] = []
    used_lesson_slugs: set[str] = set()
    course_description = ""

    def add_lesson(title: str, main: str) -> dict:
        title_max_len = max(8, 64 - len(module_slug) - 1)
        slug = f"{module_slug}-{slugify(title, max_len=title_max_len)}"
        if slug in used_lesson_slugs:
            slug = f"{slug[: 64 - 2]}-{len(lessons) + 1}"
        used_lesson_slugs.add(slug)
        lesson = {
            "position": len(lessons) + 1,
            "slug": slug,
            "title": title.strip() or f"Untitled lesson {len(lessons) + 1}",
            "main": main.strip(),
            "durationLabel": duration_label_for(main),
        }
        lessons.append(lesson)
        return lesson

    module_title = ""
    objectives_lesson: Optional[dict] = None
    last_topic_lesson: Optional[dict] = None
    key_points_lesson: Optional[dict] = None

    pretest_slides: list = []
    post_test_slides: list = []

    i = 0
    while i < len(slides):
        kind = classifications[i]
        slide = slides[i]

        if kind == "TITLE":
            title, main, desc = extract_title_slide(slide)
            module_title = title
            course_description = desc
            add_lesson(title, main)

        elif kind == "OBJECTIVES":
            title, main = build_generic_title_and_body(slide)
            objectives_lesson = add_lesson(title, main)

        elif kind == "PRETEST":
            pretest_slides.append(slide)

        elif kind == "TOPIC":
            title, main = build_generic_title_and_body(slide)
            last_topic_lesson = add_lesson(title, main)

        elif kind == "KNOWLEDGE_CHECK":
            kc = extract_knowledge_check(slide)
            options_block = "\n".join(
                f"{chr(65 + idx)}. {opt}" for idx, opt in enumerate(kc["options"])
            )
            answer_line = f"Answer: {kc['letter']}"
            if kc["rationale"]:
                answer_line += f" — {kc['rationale']}"
            block = (
                "Knowledge Check"
                + "\n\n"
                + kc["stem"]
                + ("\n" + options_block if options_block else "")
                + "\n\n"
                + answer_line
            )
            target = last_topic_lesson or objectives_lesson or (lessons[-1] if lessons else None)
            if target is not None:
                target["main"] = (target["main"] + "\n\n" + block).strip()
                target["durationLabel"] = duration_label_for(target["main"])

        elif kind == "CASE_STUDY":
            title, main = build_generic_title_and_body(slide)
            add_lesson(title, main)

        elif kind == "READINGS":
            title, main = build_generic_title_and_body(slide)
            add_lesson(title, main)

        elif kind == "KEY_POINTS":
            title, main = build_generic_title_and_body(slide)
            key_points_lesson = add_lesson(title, main)

        elif kind == "POST_TEST":
            post_test_slides.append(slide)

        elif kind == "MODULE_COMPLETE":
            if key_points_lesson is not None:
                closing = "You have completed this module's core content."
                key_points_lesson["main"] = (key_points_lesson["main"] + "\n\n" + closing).strip()
                key_points_lesson["durationLabel"] = duration_label_for(key_points_lesson["main"])

        i += 1

    # Fold the pre-test into the OBJECTIVES lesson's main (it directly follows
    # Learning Objectives in every deck).
    if pretest_slides and objectives_lesson is not None:
        pretest_questions = extract_test_questions(pretest_slides)
        body_lines = []
        for q in pretest_questions:
            body_lines.append(f"Q{q['number']}. {q['stem']}")
            for idx, opt in enumerate(q["options"]):
                body_lines.append(f"{chr(65 + idx)}. {opt}")
        block = "Pre-Test \u2014 Check Your Starting Point (not graded)\n\n" + "\n".join(body_lines)
        objectives_lesson["main"] = (objectives_lesson["main"] + "\n\n" + block).strip()
        objectives_lesson["durationLabel"] = duration_label_for(objectives_lesson["main"])

    quiz_questions = []
    if post_test_slides:
        for q in extract_test_questions(post_test_slides):
            quiz_questions.append(
                {
                    "prompt": q["stem"],
                    "options": q["options"],
                    "correctIndex": q["correctIndex"],
                }
            )

    return {
        "position": position,
        "slug": module_slug,
        "title": module_title or f"Module {position}",
        "lessons": lessons,
        "quizQuestions": quiz_questions,
        "_courseDescription": course_description,
    }


# ---------------------------------------------------------------------------
# Course-level assembly
# ---------------------------------------------------------------------------

COURSE_SUMMARY = (
    "The Drug Prevention, Treatment and Care (DPTC) sensitization course adapts the "
    "UNODC/European Union-supported \u201cResponse to Drugs and Related Organised Crime in "
    "Nigeria\u201d trainer resource for self-paced online delivery by KADSAMHSA (Kaduna State "
    "Ministry of Health / Kaduna State Agency for the Control of AIDS, Drug Abuse and "
    "Substance Use). Across 13 modules it equips law enforcement officers, health workers, "
    "social workers and community leaders across Kaduna State to understand why people use "
    "drugs, distinguish use from dependence, reduce stigma at first contact, and refer "
    "people toward evidence-based treatment and care rather than punishment alone. Each "
    "module opens with an ungraded pre-test, moves through short content lessons with an "
    "embedded knowledge check and a discussion-based case study, and closes with a "
    "graded post-test (pass mark 80%); a 26-question final assessment covers the full "
    "curriculum."
)


def build_course(modules: list[dict]) -> dict:
    total_minutes = sum(reading_minutes(lesson["main"]) for m in modules for lesson in m["lessons"])
    hours = total_minutes / 60
    if hours >= 1:
        duration_label = f"~{round(hours)} hrs \u00b7 {len(modules)} modules"
    else:
        duration_label = f"~{total_minutes} min \u00b7 {len(modules)} modules"

    final_questions = []
    for m in modules:
        for q in m["quizQuestions"][:2]:
            final_questions.append(q)

    clean_modules = []
    for m in modules:
        clean_modules.append(
            {
                "position": m["position"],
                "slug": m["slug"],
                "title": m["title"],
                "lessons": m["lessons"],
                "quizQuestions": m["quizQuestions"],
            }
        )

    return {
        "course": {
            "slug": "dptc-course",
            "title": "Sensitization on Drug Use, Drug Dependence and Drug Prevention, Treatment and Care (DPTC)",
            "summary": COURSE_SUMMARY,
            "durationLabel": duration_label,
        },
        "modules": clean_modules,
        "finalQuestions": final_questions,
    }


def main() -> int:
    modules = []
    for position, filename in enumerate(DECK_FILES, start=1):
        path = DPTC_DIR / filename
        if not path.exists():
            print(f"ERROR: missing deck {path}", file=sys.stderr)
            return 1
        print(f"Extracting module {position:>2} <- {filename}")
        modules.append(extract_module(path, position))

    course = build_course(modules)

    OUT_PATH.write_text(json.dumps(course, indent=2, ensure_ascii=False), encoding="utf-8")

    total_lessons = sum(len(m["lessons"]) for m in course["modules"])
    total_quiz_q = sum(len(m["quizQuestions"]) for m in course["modules"])
    print(f"\nWrote {OUT_PATH.relative_to(REPO_ROOT)}")
    print(f"  modules: {len(course['modules'])}")
    print(f"  lessons: {total_lessons}")
    print(f"  module quiz questions: {total_quiz_q} (expect {13 * 5})")
    print(f"  final quiz questions: {len(course['finalQuestions'])} (expect 26)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
