import { agentState } from "../graph/state";
import { getModel } from "../config/llmModels";
import { generatePdf } from "../utils/generatePdf";
import { uploadFile } from "../config/storage";
import { generateSasUrl } from "../config/storage/storage";
import { deductCredits } from "../utils/deductCredits";

const PDF_EXPIRY_HOURS = 24;

export const pdfAgent = async (state: typeof agentState.State) => {
    try {
        const llm = await getModel("pdf");

        const prompt = `
You are a professional document-generation agent.

Create structured content for a PDF based on the user's request.

USER REQUEST:
${state.prompt}

OUTPUT REQUIREMENTS:
- Return ONLY a valid JSON object.
- Do NOT wrap the JSON in markdown fences.
- Do NOT include explanations, comments, or additional text.
- Use the exact schema below.
- Generate 4–8 sections.
- Each section must contain 3–5 concise points.
- Keep every point informative and specific.
- Avoid repetition and filler.
- Use a clear logical progression between sections.
- The title should be concise and professional.
- The subtitle should briefly describe the document.
- Do not invent highly specific facts, statistics, citations, or sources unless they are provided in the request.

SCHEMA:
{
  "title": "string",
  "subtitle": "string",
  "sections": [
    {
      "heading": "string",
      "points": ["string"]
    }
  ]
}
`;

        const response = await llm.invoke(prompt);

        const content =
            typeof response.content === "string"
                ? response.content
                : response.content
                      .map((block) =>
                          typeof block === "string"
                              ? block
                              : "text" in block && typeof block.text === "string"
                                  ? block.text
                                  : ""
                      )
                      .join("");

        // Remove accidental markdown fences if the model adds them.
        const cleanedContent = content
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const parsedContent = JSON.parse(cleanedContent);

        // Accept both `sections` (current prompt) and legacy `section`.
        const rawSections = Array.isArray((parsedContent as any).sections)
            ? (parsedContent as any).sections
            : Array.isArray((parsedContent as any).section)
              ? (parsedContent as any).section
              : undefined;

        if (
            !parsedContent.title ||
            !parsedContent.subtitle ||
            !Array.isArray(rawSections)
        ) {
            throw new Error("Invalid PDF content structure returned by LLM");
        }

        const normalizedContent = {
            title: String(parsedContent.title),
            subtitle: String(parsedContent.subtitle),
            sections: rawSections,
        };

        const pdfBuffer = await generatePdf(normalizedContent);

        const titleStr = String(
            (parsedContent as any).title ?? "generated-document"
        );

        const safeFileName =
            titleStr
                .replace(/[^a-zA-Z0-9-_ ]/g, "")
                .replace(/\s+/g, "_")
                .slice(0, 80) || "generated-document";

        const blobName = `${safeFileName}-${Date.now()}.pdf`;

        const nodeBuffer = Buffer.isBuffer(pdfBuffer)
            ? pdfBuffer
            : Buffer.from(pdfBuffer as Uint8Array);

        const uploadResult = await uploadFile({
            buffer: nodeBuffer,
            blobName,
            contentType: "application/pdf",
        });

        const pdfUrl = generateSasUrl(
            uploadResult.blobName,
            PDF_EXPIRY_HOURS * 60
        );

        await deductCredits(state.userId, "pdf");

        return {
            ...state,
            aiResponse: [
                "## PDF Generated",
                "",
                `**${parsedContent.title}**`,
                "",
                parsedContent.subtitle,
                "",
                `[Download PDF](${pdfUrl})`,
                "",
                `> This download link expires in ${PDF_EXPIRY_HOURS} hours.`,
            ].join("\n"),
            // PDF is intentionally inline-only: no artifact panel.
            artifacts: [],
            images: [],
        };
    } catch (error) {
        console.error("PDF Agent Error:", error);

        return {
            ...state,
            aiResponse:
                "I couldn't generate the PDF right now. Please try again.",
            artifacts: [],
            images: [],
        };
    }
};