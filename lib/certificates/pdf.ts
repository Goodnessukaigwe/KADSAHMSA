import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { LOGO_ASPECT, LOGO_PNG_BASE64 } from "@/lib/certificates/logo";
import { UNODC_LOGO_ASPECT, UNODC_LOGO_PNG_BASE64 } from "@/lib/certificates/unodc-logo";
import { DEFAULT_PASS_MARK } from "@/lib/domain";

const AGENCY = "Kaduna State Substance Abuse and Mental Health Services Agency";

const GREEN = rgb(0.043, 0.302, 0.173); // #0b4d2c
const DARK = rgb(0.102, 0.227, 0.165); // #1a3a2a
const GOLD = rgb(0.788, 0.635, 0.153); // #c9a227
const TINT = rgb(0.91, 0.953, 0.925); // #e8f3ec
const INK = rgb(0.07, 0.1, 0.08);
const MUTED = rgb(0.32, 0.4, 0.35);

function formatIssued(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Standard PDF fonts cannot encode every character; drop what they cannot show. */
function safe(font: PDFFont, text: string) {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text)
    .map((char) => (supported.has(char.codePointAt(0) ?? 0) ? char : "?"))
    .join("");
}

function centered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
  spacing = 0
) {
  const value = safe(font, text);
  const base = font.widthOfTextAtSize(value, size);
  const total = base + spacing * Math.max(0, value.length - 1);
  let x = (page.getWidth() - total) / 2;
  if (!spacing) {
    page.drawText(value, { x, y, size, font, color });
    return;
  }
  for (const char of value) {
    page.drawText(char, { x, y, size, font, color });
    x += font.widthOfTextAtSize(char, size) + spacing;
  }
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = safe(font, text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderCertificatePdf(input: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  verificationId: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));
  const unodcLogo = await doc.embedPng(Buffer.from(UNODC_LOGO_PNG_BASE64, "base64"));

  // Frame: green outer rule, gold inner rule, gold corner squares.
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x: 22, y: 22, width: width - 44, height: height - 44,
    borderColor: GREEN, borderWidth: 5,
  });
  page.drawRectangle({
    x: 36, y: 36, width: width - 72, height: height - 72,
    borderColor: GOLD, borderWidth: 1.2,
  });
  for (const [cx, cy] of [
    [36, 36], [width - 36, 36], [36, height - 36], [width - 36, height - 36],
  ]) {
    page.drawRectangle({ x: cx - 6, y: cy - 6, width: 12, height: 12, color: GOLD });
  }

  // Header: UNODC logo top left, KADSAMHSA logo top right, then the agency name and a thin rule.
  const logoWidth = 86;
  const logoHeight = logoWidth * LOGO_ASPECT;
  const top = height - 54;
  const unodcWidth = 190;
  const unodcHeight = unodcWidth * UNODC_LOGO_ASPECT;
  page.drawImage(unodcLogo, {
    x: 66,
    y: top - logoHeight / 2 - unodcHeight / 2,
    width: unodcWidth,
    height: unodcHeight,
  });
  page.drawImage(logo, {
    x: width - 66 - logoWidth,
    y: top - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });
  centered(page, AGENCY.toUpperCase(), height - 150, sansBold, 10.5, GREEN, 0.6);
  page.drawRectangle({ x: 96, y: height - 166, width: width - 192, height: 0.8, color: TINT });

  // Title.
  centered(page, "CERTIFICATE OF COMPLETION", height - 204, sansBold, 25, DARK, 3.2);
  page.drawRectangle({ x: width / 2 - 70, y: height - 218, width: 140, height: 1.6, color: GOLD });

  // Recipient.
  centered(page, "This is to certify that", height - 248, serifItalic, 15, MUTED);
  const nameLines = wrap(serifBold, input.learnerName.trim(), 36, width - 200);
  const nameSize = nameLines.length > 1 ? 28 : 36;
  const name = nameLines.length > 1 ? wrap(serifBold, input.learnerName.trim(), nameSize, width - 200) : nameLines;
  let y = height - 290;
  for (const line of name) {
    centered(page, line, y, serifBold, nameSize, GREEN);
    y -= nameSize + 4;
  }
  const nameWidth = Math.min(
    width - 200,
    Math.max(320, serifBold.widthOfTextAtSize(name[0] ?? "", nameSize) + 60)
  );
  page.drawRectangle({ x: (width - nameWidth) / 2, y: y + nameSize - 2, width: nameWidth, height: 1, color: GOLD });

  // Course.
  y -= 12;
  centered(page, "has successfully completed the online course", y, sans, 13, MUTED);
  y -= 28;
  for (const line of wrap(sansBold, input.courseTitle, 17, 640)) {
    centered(page, line, y, sansBold, 17, INK);
    y -= 23;
  }
  centered(
    page,
    `and passed the course assessments with a score of at least ${DEFAULT_PASS_MARK}%.`,
    y - 4,
    sans,
    11.5,
    MUTED
  );

  // Footer: signatory, seal, issue details.
  const baseline = 92;
  page.drawRectangle({ x: 96, y: baseline + 22, width: 190, height: 0.8, color: INK });
  page.drawText("Authorised signatory", { x: 96, y: baseline + 8, size: 10, font: sansBold, color: INK });
  page.drawText("KADSAMHSA Academy", { x: 96, y: baseline - 6, size: 9.5, font: sans, color: MUTED });

  const cx = width / 2;
  const cy = baseline + 12;
  page.drawCircle({ x: cx, y: cy, size: 34, color: GOLD });
  page.drawCircle({ x: cx, y: cy, size: 30, color: rgb(1, 1, 1) });
  page.drawCircle({ x: cx, y: cy, size: 28, borderColor: GOLD, borderWidth: 1, color: rgb(1, 1, 1) });
  centered(page, "KADSAMHSA", cy + 2, sansBold, 7.5, GREEN, 0.4);
  centered(page, "VERIFIED", cy - 9, sansBold, 7, GOLD, 1);

  const right = width - 96;
  const issued = `Issued ${formatIssued(input.issuedAt)}`;
  page.drawText(issued, {
    x: right - sansBold.widthOfTextAtSize(issued, 11), y: baseline + 22, size: 11, font: sansBold, color: INK,
  });
  const idLabel = "Verification ID";
  page.drawText(idLabel, {
    x: right - sans.widthOfTextAtSize(idLabel, 9), y: baseline + 6, size: 9, font: sans, color: MUTED,
  });
  const id = safe(sansBold, input.verificationId);
  page.drawText(id, {
    x: right - sansBold.widthOfTextAtSize(id, 12), y: baseline - 10, size: 12, font: sansBold, color: GREEN,
  });

  centered(
    page,
    "Confirm this certificate with its Verification ID on the KADSAMHSA public verify page.",
    58,
    sans,
    8.5,
    MUTED
  );

  return doc.save();
}
