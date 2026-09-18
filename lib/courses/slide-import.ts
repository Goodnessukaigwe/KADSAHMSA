import { classifyUpload, FILE_LIMIT_BYTES } from "@/lib/courses/media";

export const MAX_SLIDE_IMPORT = 80;
export const SLIDE_RENDER_WIDTH = 1280;

export type ImportedSlide = {
  title: string;
  image: File;
};

export type SlideImportResult =
  | { ok: true; slides: ImportedSlide[] }
  | { ok: false; error: string };

export type SlideImportProgress = (current: number, total: number) => void;

const INVALID_DECK =
  "That file could not be read as a PDF. Export the slides as a PDF and try again.";

function fallbackTitle(index: number) {
  return `Slide ${index + 1}`;
}

function cleanTitle(raw: string | undefined, index: number) {
  const title = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return title.length >= 2 ? title : fallbackTitle(index);
}

function canvasToImageFile(canvas: HTMLCanvasElement, basename: string) {
  return new Promise<File>((resolve, reject) => {
    const finish = (blob: Blob | null, type: string, name: string) => {
      if (!blob || blob.size <= 0) {
        reject(new Error(`Could not render ${basename} as an image.`));
        return;
      }
      if (blob.size > FILE_LIMIT_BYTES) {
        reject(
          new Error(
            `${basename} is too large after rendering. Images must be 20 MB or smaller.`
          )
        );
        return;
      }
      resolve(new File([blob], name, { type }));
    };

    canvas.toBlob(
      (png) => {
        if (png && png.size > 0 && png.size <= FILE_LIMIT_BYTES) {
          finish(png, "image/png", `${basename}.png`);
          return;
        }
        canvas.toBlob(
          (jpeg) => finish(jpeg, "image/jpeg", `${basename}.jpg`),
          "image/jpeg",
          0.86
        );
      },
      "image/png"
    );
  });
}

export async function convertDeckToSlides(
  file: File,
  onProgress?: SlideImportProgress
): Promise<SlideImportResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Slide import only runs in the browser." };
  }

  const classified = classifyUpload(file);
  if (!classified.ok) return { ok: false, error: classified.error };
  if (classified.kind !== "pdf") {
    return {
      ok: false,
      error: "Upload a PDF to render as slides.",
    };
  }

  try {
    return await convertPdfToSlides(file, onProgress);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.includes("too large") || message.includes("more than")) {
      return { ok: false, error: message };
    }
    return { ok: false, error: INVALID_DECK };
  }
}

async function convertPdfToSlides(
  file: File,
  onProgress?: SlideImportProgress
): Promise<SlideImportResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, disableRange: true, disableStream: true });
  const pdf = await task.promise;
  try {
    const total = pdf.numPages;
    if (!total) return { ok: false, error: INVALID_DECK };
    if (total > MAX_SLIDE_IMPORT) {
      return {
        ok: false,
        error: `This deck has more than ${MAX_SLIDE_IMPORT} slides. Split it into smaller files and upload each one.`,
      };
    }

    const slides: ImportedSlide[] = [];
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      onProgress?.(pageNumber, total);
      const page = await pdf.getPage(pageNumber);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = SLIDE_RENDER_WIDTH / unscaled.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) {
        return { ok: false, error: "This browser could not render that PDF page." };
      }
      canvasContext.fillStyle = "#ffffff";
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext, viewport }).promise;
      slides.push({
        title: cleanTitle(await pdfPageTitle(page), pageNumber - 1),
        image: await canvasToImageFile(canvas, `slide-${pageNumber}`),
      });
    }
    return { ok: true, slides };
  } finally {
    await pdf.cleanup();
    await task.destroy();
  }
}

async function pdfPageTitle(page: {
  getTextContent: () => Promise<{ items: unknown[] }>;
}) {
  try {
    const content = await page.getTextContent();
    const parts: string[] = [];
    for (const item of content.items) {
      if (!item || typeof item !== "object" || !("str" in item)) continue;
      const str = String((item as { str?: unknown }).str ?? "").trim();
      if (str) parts.push(str);
      if (parts.join(" ").length >= 80) break;
    }
    return parts.join(" ");
  } catch {
    return "";
  }
}
