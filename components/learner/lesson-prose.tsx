import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Lesson text is plain lines. This lays them out like the course slides: bullets, numbered
 * steps, "term — meaning" lists, myth and fact pairs, side callouts, sources and links.
 * Colours come from the CSS variables set by the lesson page (--deep, --accent, --soft, --cream).
 */

const URL_PATTERN = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g;
const CALLOUT = /^(Plain language|Remember|Planning point|Key point|Note|Kaduna application|Important|Tip|Why it matters)\s*:\s*(.*)$/i;
const MYTH = /^Myth:\s*(.+?)\s+[—–-]\s+Fact:\s*(.+)$/i;
const NUMBERED = /^(\d{1,2})[.)]\s+(\S.*)$/;
const TERM = /^([^—–:.]{2,60}?)\s+[—–]\s+(\S.*)$|^([A-Z][^—–:.]{1,40}):\s+(\S.*)$/;
const ALL_CAPS = /^[A-Z][A-Z0-9 &'’/,:()-]{2,44}$/;

export function Linked({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-[var(--deep)] underline underline-offset-2 hover:opacity-70"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

const isUrl = (line: string) => /^https?:\/\/\S+$/.test(line);

function Item({ line, plain = false }: { line: string; plain?: boolean }): ReactNode {
  const term = plain ? null : TERM.exec(line);
  if (term) {
    const name = term[1] ?? term[3];
    const rest = term[2] ?? term[4];
    return (
      <>
        <strong className="font-semibold text-neutral-950">{name}</strong>
        <span className="text-neutral-400"> — </span>
        <Linked text={rest} />
      </>
    );
  }
  return <Linked text={line} />;
}

export function PlainBody({
  value,
  variant,
  className,
}: {
  value: string;
  /** "key" shows the lines as numbered key points on the deep colour. */
  variant?: "key";
  className?: string;
}) {
  const groups = value
    .split(/\n\s*\n/)
    .map((group) => group.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((group) => group.length);

  const out: ReactNode[] = [];
  groups.forEach((lines, gi) => {
    // Resource links: "Title — what it is" then its address on the next line.
    if (lines.some(isUrl)) {
      const cards: { title: string; note: string; url: string }[] = [];
      const rest: string[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i + 1] && isUrl(lines[i + 1]) && !isUrl(lines[i])) {
          const wide = lines[i].split(/\s{2,}[—–]\s{2,}/);
          const [title, ...note] = wide.length > 1 ? wide : lines[i].split(/\s+[—–]\s+/);
          cards.push({ title: title.trim(), note: note.join(" — ").trim(), url: lines[i + 1] });
          i += 1;
        } else if (!isUrl(lines[i])) {
          rest.push(lines[i]);
        }
      }
      out.push(
        <div key={gi} className="space-y-3">
          {rest.length ? <p className="text-[var(--accent)] italic">{rest.join(" ")}</p> : null}
          {cards.map((card) => (
            <a
              key={card.url}
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-[var(--soft)] p-4 transition hover:ring-2 hover:ring-[var(--deep)]/30"
            >
              <span className="font-semibold text-[var(--deep)] underline underline-offset-2">
                {card.title} <span aria-hidden="true">↗</span>
              </span>
              {card.note ? <span className="mt-1 block text-sm text-neutral-600">{card.note}</span> : null}
              <span className="mt-1.5 block text-xs break-all text-neutral-400">{card.url}</span>
            </a>
          ))}
        </div>
      );
      return;
    }

    // Walk the lines, collecting runs of bullets, steps and so on.
    const parts: ReactNode[] = [];
    let bullets: string[] = [];
    let steps: { n: string; text: string }[] = [];
    const flushBullets = () => {
      if (!bullets.length) return;
      const items = bullets;
      bullets = [];
      parts.push(
        <ul key={`ul-${parts.length}`} className="space-y-2.5">
          {items.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="min-w-0">
                <Item line={line} />
              </span>
            </li>
          ))}
        </ul>
      );
    };
    const flushSteps = () => {
      if (!steps.length) return;
      const items = steps;
      steps = [];
      parts.push(
        <ol key={`ol-${parts.length}`} className={cn("space-y-3.5", variant === "key" && "space-y-4")}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3.5">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                  variant === "key" ? "bg-[var(--accent)] text-white" : "bg-[var(--deep)] text-white"
                )}
              >
                {item.n}
              </span>
              <span className={cn("min-w-0 pt-0.5", variant === "key" && "text-white/90")}>
                <Item line={item.text} plain={variant === "key"} />
              </span>
            </li>
          ))}
        </ol>
      );
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const numbered = NUMBERED.exec(line);
      const myth = MYTH.exec(line);
      const callout = CALLOUT.exec(line);

      if (numbered) {
        flushBullets();
        steps.push({ n: numbered[1], text: numbered[2] });
        continue;
      }
      flushSteps();

      if (myth) {
        flushBullets();
        parts.push(
          <div key={`m-${i}`} className="overflow-hidden rounded-2xl ring-1 ring-black/10">
            <p className="bg-red-50 px-4 py-3 text-red-950">
              <span className="mr-2 text-[11px] font-bold tracking-[0.14em] text-red-700 uppercase">Myth</span>
              {myth[1]}
            </p>
            <p className="bg-emerald-50 px-4 py-3 text-emerald-950">
              <span className="mr-2 text-[11px] font-bold tracking-[0.14em] text-emerald-700 uppercase">Fact</span>
              {myth[2]}
            </p>
          </div>
        );
        continue;
      }
      if (callout) {
        flushBullets();
        const following: string[] = [];
        while (lines[i + 1] && !CALLOUT.test(lines[i + 1]) && /^(Plain language)$/i.test(callout[1])) {
          following.push(lines[i + 1]);
          i += 1;
        }
        parts.push(
          <aside key={`c-${i}`} className="rounded-2xl bg-[var(--cream)] p-4 ring-1 ring-[var(--accent)]/25">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--accent)] uppercase">{callout[1]}</p>
            {[callout[2], ...following].filter(Boolean).map((text, k) => (
              <p key={k} className="mt-1.5 text-[15px] leading-relaxed text-neutral-800">
                <Item line={text} />
              </p>
            ))}
          </aside>
        );
        continue;
      }
      if (/^Source:/i.test(line)) {
        flushBullets();
        parts.push(
          <p key={`s-${i}`} className="border-t border-neutral-200 pt-3 text-xs text-neutral-400 italic">
            <Linked text={line} />
          </p>
        );
        continue;
      }
      if (/^(PLAIN LANGUAGE|REMEMBER|NOTE|TIP|IMPORTANT|KEY TERMS?)$/.test(line) && lines[i + 1]) {
        flushBullets();
        const inside = lines.slice(i + 1);
        i = lines.length;
        parts.push(
          <aside key={`k-${i}`} className="rounded-2xl bg-[var(--cream)] p-4 ring-1 ring-[var(--accent)]/25">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--accent)] uppercase">{line}</p>
            {inside.map((text, k) => (
              <p key={k} className="mt-1.5 text-[15px] leading-relaxed text-neutral-800">
                <Item line={text} />
              </p>
            ))}
          </aside>
        );
        continue;
      }
      if (ALL_CAPS.test(line)) {
        flushBullets();
        parts.push(
          <p key={`l-${i}`} className="pt-1 text-[11px] font-bold tracking-[0.18em] text-[var(--accent)] uppercase">
            {line}
          </p>
        );
        continue;
      }
      if (/^Reflect\b/i.test(line) || /\bin your own notes\b/i.test(line)) {
        flushBullets();
        const questions = lines.slice(i + 1);
        i = lines.length;
        parts.push(
          <aside key={`r-${i}`} className="rounded-2xl bg-[var(--soft)] p-5">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--deep)] uppercase">Reflect</p>
            <p className="mt-1 text-[15px] text-neutral-700">{line}</p>
            {questions.length ? (
              <ol className="mt-3 space-y-2">
                {questions.map((q, k) => (
                  <li key={k} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--deep)] text-xs font-bold text-white">
                      {k + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">{q}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </aside>
        );
        continue;
      }

      // A line that ends in a colon, or the only line in its group, reads as a paragraph.
      if (lines.length === 1 || /[:.?!]$/.test(line) && (lines[i + 1] ? !TERM.test(line) : true)) {
        flushBullets();
        parts.push(
          <p key={`p-${i}`} className={cn("leading-[1.75]", lines.length === 1 && gi === 0 && "text-[17px]")}>
            <Linked text={line} />
          </p>
        );
        continue;
      }
      bullets.push(line);
    }
    flushBullets();
    flushSteps();
    out.push(
      <div key={gi} className="space-y-3.5">
        {parts}
      </div>
    );
  });

  if (variant === "key") {
    return (
      <div className={cn("rounded-3xl bg-[var(--deep)] p-6 text-white sm:p-8", className)}>
        <div className="space-y-4">{out}</div>
      </div>
    );
  }
  return <div className={cn("space-y-5", className)}>{out}</div>;
}
