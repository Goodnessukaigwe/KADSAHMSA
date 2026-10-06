/**
 * Multiple-choice checks written into lesson text, for example:
 *
 *   Q1. Which statement is true?
 *   A. First option
 *   B. Second option
 *   Answer: B — because ...
 *
 * `splitChecks` turns them into interactive questions. The "Answer:" line is optional; without it
 * the learner's choice is simply recorded.
 */

export type LessonCheck = {
  prompt: string;
  options: string[];
  /** Index of the correct option, when the text gives one. */
  answer: number | null;
  explanation: string | null;
};

export type TextSegment = { type: "text"; text: string } | { type: "check"; check: LessonCheck };

const OPTION = /^([A-F])[.)]\s+(\S.*)$/;
const ANSWER = /^Answer:\s*([A-F])\b\s*(?:[—–-]\s*)?(.*)$/i;
const LETTERS = "ABCDEF";

export function splitChecks(text: string): TextSegment[] {
  const lines = text.split("\n");
  const segments: TextSegment[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const joined = buffer.join("\n");
    if (joined.trim()) segments.push({ type: "text", text: joined });
    buffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const first = OPTION.exec((lines[i + 1] ?? "").trim());
    if (line && !OPTION.test(line) && first?.[1] === "A") {
      const options: string[] = [first[2].trim()];
      let k = i + 2;
      while (k < lines.length) {
        const match = OPTION.exec(lines[k].trim());
        if (!match || match[1] !== LETTERS[options.length]) break;
        options.push(match[2].trim());
        k += 1;
      }
      if (options.length >= 2) {
        let answer: number | null = null;
        let explanation: string | null = null;
        let probe = k;
        while (probe < lines.length && !lines[probe].trim()) probe += 1;
        const found = ANSWER.exec((lines[probe] ?? "").trim());
        if (found) {
          const index = LETTERS.indexOf(found[1].toUpperCase());
          if (index >= 0 && index < options.length) {
            answer = index;
            explanation = found[2].trim() || null;
            k = probe + 1;
          }
        }
        flush();
        segments.push({
          type: "check",
          check: { prompt: line.replace(/^Q\d+[.)]\s*/i, ""), options, answer, explanation },
        });
        i = k;
        continue;
      }
    }
    buffer.push(lines[i]);
    i += 1;
  }
  flush();
  return segments;
}
