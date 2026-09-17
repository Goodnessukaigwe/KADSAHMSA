const ALLOWED_TAGS = new Set(["p", "br", "strong", "em", "a", "ul", "ol", "li"]);
const RENAME_TAGS: Record<string, string> = { b: "strong", i: "em" };
const VOID_TAGS = new Set(["br"]);
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "noscript",
  "iframe",
  "object",
  "embed",
  "svg",
  "link",
  "meta",
]);
const BLOCKISH_UNWRAP = new Set([
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "section",
  "article",
  "header",
  "footer",
]);

export function hasLessonMarkup(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(value);
}

export function splitLessonParagraphs(value: string): string[] {
  if (!value.trim()) return [""];
  const parts = value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [""];
}

export function joinLessonParagraphs(parts: string[]): string {
  return parts.map(serializeLessonParagraph).filter((part) => part.length > 0).join("\n\n");
}

export function toEditableHtml(stored: string): string {
  if (!stored) return "";
  if (!hasLessonMarkup(stored)) {
    return escapeText(stored).replace(/\n/g, "<br>");
  }
  return sanitizeLessonHtml(stored);
}

export function serializeLessonParagraph(html: string): string {
  const sanitized = sanitizeLessonHtml(html).trim();
  if (!sanitized || isVisuallyEmpty(sanitized)) return "";

  const unwrapped = unwrapSingleParagraph(sanitized);
  const withBreaks = unwrapped.replace(/<br\s*\/?>/gi, "\n");
  if (!hasLessonMarkup(withBreaks)) {
    return decodeEntities(withBreaks).replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trimEnd();
  }
  return sanitized;
}

export function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("?") ||
    trimmed.startsWith("//")
  ) {
    return sanitizeHref(trimmed);
  }
  if (trimmed.includes("@") && !trimmed.includes(" ")) {
    return sanitizeHref(`mailto:${trimmed}`);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return sanitizeHref(`https://${trimmed}`);
}

export function sanitizeLessonHtml(html: string): string {
  let i = 0;
  const out: string[] = [];
  const stack: string[] = [];
  const spanWraps: number[] = [];
  let lastWasBreak = true;

  const emitBreak = () => {
    if (!lastWasBreak && out.length) {
      out.push("<br>");
      lastWasBreak = true;
    }
  };

  while (i < html.length) {
    if (html[i] !== "<") {
      const next = html.indexOf("<", i);
      const chunk = next === -1 ? html.slice(i) : html.slice(i, next);
      const text = decodeEntities(chunk).replace(/\u00a0/g, " ");
      if (text) {
        out.push(escapeText(text));
        lastWasBreak = /\n\s*$/.test(text);
      }
      i = next === -1 ? html.length : next;
      continue;
    }

    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }

    const close = html.indexOf(">", i + 1);
    if (close === -1) {
      out.push(escapeText(decodeEntities(html.slice(i))));
      break;
    }

    const rawTag = html.slice(i + 1, close);
    i = close + 1;
    const selfClosing = /\/\s*$/.test(rawTag);
    const body = rawTag.replace(/\/\s*$/, "").trim();
    if (!body) continue;

    const isClose = body.startsWith("/");
    const nameMatch = body.match(/^\/?\s*([a-zA-Z][a-zA-Z0-9]*)/);
    if (!nameMatch) continue;

    let tag = nameMatch[1].toLowerCase();
    tag = RENAME_TAGS[tag] ?? tag;
    const attrPart = body.replace(/^\/?\s*[a-zA-Z][a-zA-Z0-9]*/, "");

    if (isClose) {
      if (tag === "span") {
        const wraps = spanWraps.pop() ?? 0;
        for (let n = 0; n < wraps; n += 1) {
          const open = stack.pop();
          if (open) out.push(`</${open}>`);
        }
        continue;
      }
      if (BLOCKISH_UNWRAP.has(tag)) {
        emitBreak();
        continue;
      }
      const idx = stack.lastIndexOf(tag);
      if (idx >= 0) {
        while (stack.length > idx) {
          const open = stack.pop();
          if (open) out.push(`</${open}>`);
        }
        lastWasBreak = tag === "p" || tag === "li" || tag === "ul" || tag === "ol";
      }
      continue;
    }

    if (DROP_WITH_CONTENT.has(tag)) {
      i = skipUntilClose(html, i, tag);
      continue;
    }

    if (tag === "br" || (VOID_TAGS.has(tag) && selfClosing)) {
      emitBreak();
      continue;
    }

    if (VOID_TAGS.has(tag)) {
      if (ALLOWED_TAGS.has(tag)) {
        emitBreak();
      }
      continue;
    }

    if (BLOCKISH_UNWRAP.has(tag)) {
      emitBreak();
      continue;
    }

    if (tag === "span") {
      const style = styleAttr(attrPart);
      const wraps: string[] = [];
      if (/font-weight\s*:\s*(bold|[7-9]00)\b/i.test(style)) wraps.push("strong");
      if (/font-style\s*:\s*italic\b/i.test(style)) wraps.push("em");
      spanWraps.push(wraps.length);
      for (const wrap of wraps) {
        stack.push(wrap);
        out.push(`<${wrap}>`);
        lastWasBreak = false;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      continue;
    }

    if (tag === "a") {
      const href = parseHref(attrPart);
      if (!href) continue;
      stack.push("a");
      out.push(`<a href="${escapeAttr(href)}">`);
      lastWasBreak = false;
      continue;
    }

    if (tag === "br") {
      emitBreak();
      continue;
    }

    stack.push(tag);
    out.push(`<${tag}>`);
    lastWasBreak = tag === "p" || tag === "ul" || tag === "ol" || tag === "li";
  }

  while (stack.length) {
    const open = stack.pop();
    if (open) out.push(`</${open}>`);
  }

  return collapseBreaks(out.join(""));
}

function skipUntilClose(html: string, from: number, tag: string): number {
  const re = new RegExp(`</${tag}\\b`, "i");
  const rest = html.slice(from);
  const match = rest.match(re);
  if (!match || match.index == null) return html.length;
  const close = html.indexOf(">", from + match.index);
  return close === -1 ? html.length : close + 1;
}

function styleAttr(attrString: string): string {
  const match = attrString.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function parseHref(attrString: string): string | null {
  const match = attrString.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!match) return null;
  return sanitizeHref(decodeEntities((match[1] ?? match[2] ?? match[3] ?? "").trim()));
}

function sanitizeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  const lower = href.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    if (
      !lower.startsWith("http://") &&
      !lower.startsWith("https://") &&
      !lower.startsWith("mailto:")
    ) {
      return null;
    }
  }
  return href;
}

function unwrapSingleParagraph(html: string): string {
  const match = html.match(/^<p>([\s\S]*)<\/p>$/i);
  if (!match) return html;
  const inner = match[1];
  if (/<\/?p\b/i.test(inner)) return html;
  return inner;
}

function isVisuallyEmpty(html: string): boolean {
  return html.replace(/<br\s*\/?>/gi, "").replace(/<\/?[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim() === "";
}

function collapseBreaks(html: string): string {
  return html.replace(/^(?:<br>)+|(?:<br>)+$/g, "").replace(/(?:<br>){3,}/g, "<br><br>");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function codePoint(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return "";
  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
}
