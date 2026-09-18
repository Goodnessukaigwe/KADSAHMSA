import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  try {
    const path = join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
    const data = await readFile(path);
    return new Response(data, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("PDF worker not found.", { status: 404 });
  }
}
