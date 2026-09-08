import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { site } from "@/lib/content/landing";
import { DEFAULT_PASS_MARK } from "@/lib/domain";

function formatIssued(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
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
  const heading = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.35, 0.35, 0.35);
  const line = rgb(0.12, 0.12, 0.12);

  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: line,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 1,
  });

  page.drawText(site.name, {
    x: 72,
    y: height - 110,
    size: 14,
    font: heading,
    color: ink,
  });
  page.drawText(site.fullName, {
    x: 72,
    y: height - 130,
    size: 10,
    font: body,
    color: muted,
  });

  page.drawText("Certificate of completion", {
    x: 72,
    y: height - 190,
    size: 28,
    font: heading,
    color: ink,
  });
  page.drawText("This certifies that", {
    x: 72,
    y: height - 230,
    size: 12,
    font: body,
    color: muted,
  });
  page.drawText(input.learnerName, {
    x: 72,
    y: height - 268,
    size: 26,
    font: heading,
    color: ink,
  });
  page.drawText("has completed", {
    x: 72,
    y: height - 304,
    size: 12,
    font: body,
    color: muted,
  });
  page.drawText(input.courseTitle, {
    x: 72,
    y: height - 332,
    size: 13,
    font: heading,
    color: ink,
  });
  page.drawText(
    `and passed the certificate-qualifying assessment at or above ${DEFAULT_PASS_MARK}%.`,
    {
      x: 72,
      y: height - 360,
      size: 12,
      font: body,
      color: muted,
    }
  );

  page.drawText(`Issued ${formatIssued(input.issuedAt)}`, {
    x: 72,
    y: 120,
    size: 11,
    font: body,
    color: ink,
  });
  page.drawText(`Verification ID  ${input.verificationId}`, {
    x: 72,
    y: 98,
    size: 11,
    font: heading,
    color: ink,
  });
  page.drawText("Confirm this ID on the KADSAMHSA public verify page. Do not share a file URL.", {
    x: 72,
    y: 78,
    size: 9,
    font: body,
    color: muted,
  });

  return doc.save();
}
