#!/usr/bin/env python3
"""
MhGAP Basic course extractor.

Reads the five MhGAP_Basic_Module_N_*.pptx decks and writes
scripts/mhgap/mhgap-course.generated.json in the same shape as the DPTC
manifest, so scripts/import-dptc-course.ts can load it (npm run import:mhgap).

Usage (python-pptx required):

    python3 scripts/mhgap/extract.py <deck-dir>

Per deck: the title slide becomes the module intro lesson, the pre-test slides
become one ungraded "Pre-test" lesson (no answers shown), the post-test slides
become the graded module quiz (answers come from the "Answer key" slide), and
every other slide becomes one lesson. The answer-key slide itself is not
published as a lesson because the post-test repeats the pre-test questions.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from pptx import Presentation

OUT_PATH = Path(__file__).resolve().parent / "mhgap-course.generated.json"
FOOTER_PREFIX = "KADSAMHSA  ·  MhGAP Basic"
OPTION_SPLIT_RE = re.compile(r"\s{3,}(?=[A-D]\.\s)")
OPTION_RE = re.compile(r"^([A-D])\.\s+(.*)$")
KEY_RE = re.compile(r"^(\d+)\s*·\s*([A-D])$")
LETTER_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}
DURATION = "2 min read"


def paragraphs(slide):
    """(text, bold) for every non-empty paragraph, footer removed."""
    out = []
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for para in shape.text_frame.paragraphs:
            text = "".join(r.text for r in para.runs).strip()
            if not text or text.startswith(FOOTER_PREFIX):
                continue
            out.append((text, any(bool(r.font.bold) for r in para.runs)))
    # trailing page number is the only non-bold digit-only paragraph
    return [(t, b) for t, b in out if not (t.isdigit() and not b)]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def classify(slide, index: int) -> str:
    if index == 0:
        return "TITLE"
    eyebrow = paragraphs(slide)[0][0].upper() if paragraphs(slide) else ""
    if eyebrow.startswith("PRE-TEST"):
        return "PRETEST"
    if eyebrow.startswith("POST-TEST"):
        return "POSTTEST"
    if eyebrow.startswith("ANSWER KEY"):
        return "ANSWERKEY"
    return "TOPIC"


def lesson_from_slide(slide) -> tuple[str, str]:
    """eyebrow + title + body. The eyebrow label is kept as the first heading."""
    paras = paragraphs(slide)
    eyebrow, title, rest = paras[0][0], paras[1][0], paras[2:]
    lines: list[str] = []
    pending = None
    for text, bold in rest:
        if bold and text.isdigit():
            pending = text
            continue
        if pending is not None:
            lines.append(f"{pending}. {text}")
            pending = None
        else:
            lines.append(text)
    body = "\n".join(lines)
    return title, f"{eyebrow.title()}\n\n{body}" if eyebrow else body


def questions_from_slides(slides) -> list[dict]:
    """Numbered question boxes: bold digit, bold stem, then 'A. .. B. ..' line."""
    questions = []
    for slide in slides:
        paras = paragraphs(slide)[2:]
        i = 0
        while i < len(paras):
            text, bold = paras[i]
            if bold and text.isdigit() and i + 2 < len(paras):
                stem = paras[i + 1][0]
                options = [
                    OPTION_RE.match(o.strip()).group(2).strip()
                    for o in OPTION_SPLIT_RE.split(paras[i + 2][0])
                ]
                questions.append({"number": int(text), "prompt": stem, "options": options})
                i += 3
            else:
                i += 1
    return sorted(questions, key=lambda q: q["number"])


def answer_key(slide) -> dict[int, int]:
    out = {}
    for text, bold in paragraphs(slide):
        m = KEY_RE.match(text)
        if m:
            out[int(m.group(1))] = LETTER_INDEX[m.group(2)]
    return out


def pretest_body(questions: list[dict]) -> str:
    lines = [
        "Pre-test: check your starting point (not graded)",
        "",
        "Write down your answers on paper or your phone. Your score is only for you.",
        "",
    ]
    for q in questions:
        lines.append(f"Q{q['number']}. {q['prompt']}")
        for letter, option in zip("ABCD", q["options"]):
            lines.append(f"{letter}. {option}")
        lines.append("")
    return "\n".join(lines).strip()


def build_module(path: Path, deck_number: int) -> dict:
    # Decks are numbered from 0 (Welcome), but DB positions must be > 0.
    position = deck_number + 1
    prs = Presentation(str(path))
    slides = list(prs.slides)
    lessons: list[tuple[str, str]] = []
    pre, post, key = [], [], {}
    module_title = ""

    for i, slide in enumerate(slides):
        kind = classify(slide, i)
        if kind == "TITLE":
            paras = paragraphs(slide)
            module_title = paras[2][0]
            body = "\n".join(t for t, _ in paras[3:]).replace(
                "Mental Health Services Agency", "Mental Health Services Agency (KADSAMHSA)"
            )
            lessons.append((module_title, body))
        elif kind == "PRETEST":
            pre.append(slide)
        elif kind == "POSTTEST":
            post.append(slide)
        elif kind == "ANSWERKEY":
            key = answer_key(slide)
        else:
            title, body = lesson_from_slide(slide)
            if title.lower() == "three simple steps":
                continue  # identical boilerplate on every deck
            lessons.append((title, body))

    pre_q = questions_from_slides(pre)
    post_q = questions_from_slides(post)
    if pre_q:
        # place the pre-test straight after "What you will learn"
        at = next((n for n, (t, _) in enumerate(lessons) if t == "What you will learn"), 0) + 1
        lessons.insert(at, ("Pre-test", pretest_body(pre_q)))

    slug_prefix = f"module-{deck_number}"
    quiz = []
    for q in post_q:
        if q["number"] not in key:
            raise SystemExit(f"{path.name}: no answer key for Q{q['number']}")
        quiz.append({"prompt": q["prompt"], "options": q["options"], "correctIndex": key[q["number"]]})

    return {
        "position": position,
        "slug": slug_prefix,
        "title": module_title,
        "lessons": [
            {
                "position": n,
                "slug": f"{slug_prefix}-{slugify(title)}",
                "title": title,
                "main": body,
                "durationLabel": DURATION,
            }
            for n, (title, body) in enumerate(lessons, start=1)
        ],
        "quizQuestions": quiz,
    }


def main() -> None:
    deck_dir = Path(sys.argv[1])
    decks = sorted(
        deck_dir.glob("*MhGAP_Basic_Module_*.pptx"),
        key=lambda p: int(re.search(r"Module_(\d+)_", p.name).group(1)),
    )
    if not decks:
        raise SystemExit(f"No MhGAP_Basic_Module_*.pptx files in {deck_dir}")
    modules = [build_module(p, int(re.search(r"Module_(\d+)_", p.name).group(1))) for p in decks]
    course = {
        "course": {
            "slug": "mhgap-basic",
            "title": "MhGAP Basic: Mental Health for Communities",
            "summary": (
                "A free online course from the Kaduna State Substance Abuse and Mental Health "
                "Service Agency (KADSAMHSA), adapted from the WHO mhGAP Intervention Guide 3.0. It gives "
                "the background knowledge to understand mental health, recognise priority "
                "conditions such as depression, anxiety and psychoses, and support people with "
                "respect. Each module has an ungraded pre-test, short lessons and a graded "
                "post-test (pass mark 80%)."
            ),
            "durationLabel": f"{len(modules)} modules · 45–60 min each",
        },
        "modules": modules,
        "finalQuestions": [],
    }
    OUT_PATH.write_text(json.dumps(course, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for m in modules:
        print(f"Module {m['position']}: {m['title']} — {len(m['lessons'])} lessons, {len(m['quizQuestions'])} quiz questions")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
