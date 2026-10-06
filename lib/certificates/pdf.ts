import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import QRCode from "qrcode";

import { siteUrl } from "@/lib/email/send";
import { LOGO_ASPECT, LOGO_PNG_BASE64 } from "@/lib/certificates/logo";
import { UNODC_LOGO_ASPECT, UNODC_LOGO_PNG_BASE64 } from "@/lib/certificates/unodc-logo";
import { DEFAULT_PASS_MARK } from "@/lib/domain";

const AGENCY = "Kaduna State Substance Abuse and Mental Health Services Agency";

const GREEN = rgb(0.043, 0.302, 0.173); // #0b4d2c
const DARK = rgb(0.102, 0.227, 0.165); // #1a3a2a
const GOLD = rgb(0.788, 0.635, 0.153); // #c9a227
const TINT = rgb(0.91, 0.953, 0.925); // #e8f3ec
const SLATE = rgb(0.43, 0.49, 0.56); // #6e7d8f
const FRAME = rgb(0.62, 0.7, 0.78); // #9fb3c7
const WAX = rgb(0.6, 0.1, 0.1); // #991a1a
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
  const serifBoldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));
  const unodcLogo = await doc.embedPng(Buffer.from(UNODC_LOGO_PNG_BASE64, "base64"));

  // Frame, after the printed template: a chain of rings between two fine rules.
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 16, y: 16, width: width - 32, height: height - 32, borderColor: FRAME, borderWidth: 0.8 });
  const ring = 7;
  const step = 9;
  for (let x = 30; x <= width - 30; x += step) {
    for (const y of [30, height - 30]) {
      page.drawCircle({ x, y, size: ring, borderColor: FRAME, borderWidth: 0.7 });
    }
  }
  for (let y = 30; y <= height - 30; y += step) {
    for (const x of [30, width - 30]) {
      page.drawCircle({ x, y, size: ring, borderColor: FRAME, borderWidth: 0.7 });
    }
  }
  page.drawRectangle({ x: 46, y: 46, width: width - 92, height: height - 92, borderColor: FRAME, borderWidth: 1.4 });
  page.drawRectangle({ x: 50, y: 50, width: width - 100, height: height - 100, borderColor: FRAME, borderWidth: 0.5 });

  // Header: UNODC top left, KADSAMHSA top right.
  const unodcWidth = 190;
  const unodcHeight = unodcWidth * UNODC_LOGO_ASPECT;
  const logoWidth = 74;
  const logoHeight = logoWidth * LOGO_ASPECT;
  const top = height - 76;
  page.drawImage(unodcLogo, {
    x: 84,
    y: top - logoHeight / 2 - unodcHeight / 2,
    width: unodcWidth,
    height: unodcHeight,
  });
  page.drawImage(logo, { x: width - 84 - logoWidth, y: top - logoHeight, width: logoWidth, height: logoHeight });
  centered(page, AGENCY.toUpperCase(), height - 148, sansBold, 8.5, SLATE, 0.5);

  // Title.
  centered(page, "CERTIFICATE OF COMPLETION", height - 192, sansBold, 31, SLATE, 1.6);

  // Recipient.
  centered(page, "This is to certify that", height - 226, sans, 14, MUTED);
  const nameLines = wrap(serifBoldItalic, input.learnerName.trim(), 38, width - 220);
  const nameSize = nameLines.length > 1 ? 28 : 38;
  const name = nameLines.length > 1 ? wrap(serifBoldItalic, input.learnerName.trim(), nameSize, width - 220) : nameLines;
  let y = height - 268;
  for (const line of name) {
    centered(page, line, y, serifBoldItalic, nameSize, INK);
    y -= nameSize + 4;
  }
  const nameWidth = Math.min(
    width - 220,
    Math.max(360, serifBoldItalic.widthOfTextAtSize(name[0] ?? "", nameSize) + 60)
  );
  page.drawRectangle({ x: (width - nameWidth) / 2, y: y + nameSize - 2, width: nameWidth, height: 1, color: SLATE });

  // Course.
  y -= 10;
  centered(page, "has successfully completed the online course", y, sans, 12.5, MUTED);
  y -= 26;
  for (const line of wrap(sansBold, input.courseTitle, 16, 620)) {
    centered(page, line, y, sansBold, 16, INK);
    y -= 21;
  }
  centered(
    page,
    `and passed the course assessments with a score of at least ${DEFAULT_PASS_MARK}%.`,
    y - 2,
    sans,
    11,
    MUTED
  );

  // Signatories, as on the printed certificate.
  const lineY = 144;
  const block = (x: number, lines: [string, string, string]) => {
    page.drawRectangle({ x, y: lineY, width: 190, height: 0.9, color: INK });
    page.drawText(lines[0], { x, y: lineY - 15, size: 11.5, font: sansBold, color: INK });
    page.drawText(lines[1], { x, y: lineY - 28, size: 9, font: sans, color: MUTED });
    page.drawText(lines[2], { x, y: lineY - 40, size: 9, font: sans, color: MUTED });
  };
  block(96, ["Joseph O. Ike", "Director General,", "KADSAMHSA"]);

  // Wax seal.
  const cx = width / 2;
  const cy = lineY - 8;
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    page.drawCircle({ x: cx + Math.cos(angle) * 34, y: cy + Math.sin(angle) * 34, size: 7.5, color: WAX });
  }
  page.drawCircle({ x: cx, y: cy, size: 35, color: WAX });
  page.drawCircle({ x: cx, y: cy, size: 27, borderColor: rgb(0.78, 0.35, 0.35), borderWidth: 1.2 });
  centered(page, "KADSAMHSA", cy + 2, sansBold, 7, rgb(1, 1, 1), 0.4);
  centered(page, "ACADEMY", cy - 8, sansBold, 6, rgb(0.95, 0.8, 0.8), 1);

  // Verification: a QR code to the public verify page (address from SITE_URL, so it can move later).
  const verifyBase = `${siteUrl()}/verify`;
  const verifyUrl = `${verifyBase}?id=${encodeURIComponent(input.verificationId)}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 360, errorCorrectionLevel: "M" });
  const qr = await doc.embedPng(qrPng);
  const qrSize = 58;
  const qrX = width - 96 - qrSize - 66 + 66;
  page.drawImage(qr, { x: qrX, y: cy - 28, width: qrSize, height: qrSize });
  const scan = "Scan to verify";
  page.drawText(scan, {
    x: qrX + qrSize / 2 - sans.widthOfTextAtSize(scan, 7) / 2, y: cy - 38, size: 7, font: sans, color: MUTED,
  });

  const details = safe(
    sansBold,
    `Issued ${formatIssued(input.issuedAt)}   |   Verification ID: ${input.verificationId}`
  );
  centered(page, details, 72, sansBold, 9, GREEN);
  centered(
    page,
    `Confirm this certificate at ${verifyBase.replace(/^https?:\/\//, "")} with its Verification ID, or scan the code.`,
    60,
    sans,
    8,
    MUTED
  );

  return doc.save();
}
