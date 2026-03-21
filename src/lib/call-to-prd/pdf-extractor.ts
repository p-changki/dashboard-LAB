import { readFile } from "node:fs/promises";

interface PdfExtractResult {
  text: string;
  pageCount: number;
}

export async function extractPdfText(filePath: string): Promise<PdfExtractResult> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();

    return {
      text: data.text.trim(),
      pageCount: data.pages.length,
    };
  } finally {
    await parser.destroy();
  }
}
