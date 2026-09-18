declare module "pptx-browser" {
  export class PptxRenderer {
    slideCount: number;
    load(source: File | Blob | ArrayBuffer | Uint8Array): Promise<void>;
    renderSlide(
      slideIndex: number,
      canvas: HTMLCanvasElement,
      width?: number
    ): Promise<void>;
    extractSlide(slideIndex: number): Promise<{ title?: string }>;
    destroy(): void;
  }
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const src: string;
  export default src;
}
