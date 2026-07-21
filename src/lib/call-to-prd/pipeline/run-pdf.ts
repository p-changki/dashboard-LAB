import { updateStatus } from "@/lib/call-to-prd/call-store";
import { analyzePdf } from "@/lib/call-to-prd/pdf-analyzer";
import { extractPdfText } from "@/lib/call-to-prd/pdf-extractor";
import {
  formatCallToPrdPdfAnalysisFailedMessage,
  formatCallToPrdPdfAnalysisProgress,
  formatCallToPrdPdfExtractFailedMessage,
  formatCallToPrdPdfNoTextMessage,
} from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import { getErrorMessage } from "@/lib/call-to-prd/pipeline/shared";

// Extract-and-analyze the optional PDF attachment. Returns the extracted text,
// its structured analysis, and any warnings to fold into generationWarnings.
// Failures degrade gracefully — the pipeline continues without the PDF.
export async function runPdfPipeline(
  id: string,
  pdfPath: string | null,
  pdfFileName: string | null,
  locale: ReturnType<typeof readLocaleFromHeaders>,
): Promise<{ pdfContent: string | null; pdfAnalysis: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  let pdfContent: string | null = null;
  let pdfAnalysis: string | null = null;

  if (pdfPath) {
    try {
      updateStatus(id, "extracting-pdf");
      const extracted = await extractPdfText(pdfPath);
      pdfContent = extracted.text;
      updateStatus(id, "analyzing-pdf", { pdfContent });

      if (!pdfContent) {
        // The parser can succeed while yielding no text (scanned/image-only PDFs).
        // Without this the PDF is dropped from the prompt with no user-visible trace.
        warnings.push(formatCallToPrdPdfNoTextMessage(locale));
      } else {
        try {
          pdfAnalysis = await analyzePdf(
            pdfContent,
            pdfFileName ?? "document.pdf",
            ({ current, total }) => {
              updateStatus(id, "analyzing-pdf", {
                pdfContent,
                pdfAnalysis: formatCallToPrdPdfAnalysisProgress(locale, current, total),
              });
            },
          );
        } catch (err) {
          console.error("PDF analysis failed:", err);
          warnings.push(
            formatCallToPrdPdfAnalysisFailedMessage(getErrorMessage(err, locale), locale),
          );
        }
      }
    } catch (err) {
      console.error("PDF extraction failed:", err);
      warnings.push(
        formatCallToPrdPdfExtractFailedMessage(getErrorMessage(err, locale), locale),
      );
    }
  }

  return { pdfContent, pdfAnalysis, warnings };
}
