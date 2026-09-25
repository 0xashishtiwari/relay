import { agentState } from "../graph/state";
import { getModel } from "../config/llmModels";
import { generatePpt } from "../utils/generatePpt";
import { uploadFile } from "../config/storage";
import { generateSasUrl } from "../config/storage/storage";

const PPT_EXPIRY_HOURS = 24;

export const pptAgent = async (state: typeof agentState.State) => {
    try {
        const llm = await getModel("ppt");

        const prompt = `
You are a professional presentation-generation agent.

Create structured content for a presentation based on the user's request.

USER REQUEST:
${state.prompt}

OUTPUT REQUIREMENTS:
- Return ONLY a valid JSON object.
- Do NOT wrap the JSON in markdown fences.
- Do NOT include explanations, comments, or additional text.
- Use the exact schema below.
- Generate exactly 5 slides.
- Each slide must have a title and 3-5 concise bullet points.
- Keep every point informative and specific.
- Avoid repetition and filler.
- Use a clear logical progression between slides.
- The title should be concise and professional.
- The subtitle should briefly describe the presentation.
- Do not invent highly specific facts, statistics, citations, or sources unless they are provided in the request.

SCHEMA:
{
  "title": "string",
  "subtitle": "string",
  "slides": [
    {
      "title": "string",
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

        // Accept both `slides` (current prompt) and legacy `sections`.
        const rawSlides = Array.isArray((parsedContent as any).slides)
            ? (parsedContent as any).slides
            : Array.isArray((parsedContent as any).sections)
              ? (parsedContent as any).sections.map((s: any) => ({
                    title: s?.heading ?? s?.title,
                    points: s?.points,
                }))
              : undefined;

        if (
            !parsedContent.title ||
            !Array.isArray(rawSlides) ||
            rawSlides.length === 0
        ) {
            throw new Error("Invalid presentation content structure returned by LLM");
        }

        const normalizedContent = {
            title: String(parsedContent.title),
            subtitle:
                typeof parsedContent.subtitle === "string"
                    ? parsedContent.subtitle
                    : "",
            slides: rawSlides,
        };

        const pptBuffer = await generatePpt(normalizedContent);

        const titleStr = String(
            (parsedContent as any).title ?? "generated-presentation"
        );

        const safeFileName =
            titleStr
                .replace(/[^a-zA-Z0-9-_ ]/g, "")
                .replace(/\s+/g, "_")
                .slice(0, 80) || "generated-presentation";

        const blobName = `${safeFileName}-${Date.now()}.pptx`;

        const nodeBuffer = Buffer.isBuffer(pptBuffer)
            ? pptBuffer
            : Buffer.from(pptBuffer as Uint8Array);

        const uploadResult = await uploadFile({
            buffer: nodeBuffer,
            blobName,
            contentType:
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        });

        const pptUrl = generateSasUrl(
            uploadResult.blobName,
            PPT_EXPIRY_HOURS * 60
        );

        return {
            ...state,
            aiResponse: [
                "## Presentation Generated",
                "",
                `**${normalizedContent.title}**`,
                "",
                normalizedContent.subtitle,
                "",
                `${normalizedContent.slides.length} slides`,
                "",
                `[Download Presentation](${pptUrl})`,
                "",
                `> This download link expires in ${PPT_EXPIRY_HOURS} hours.`,
            ].join("\n"),
            // PPT is intentionally inline-only: no artifact panel.
            artifacts: [],
            images: [],
        };
    } catch (error) {
        console.error("PPT Agent Error:", error);

        return {
            ...state,
            aiResponse:
                "I couldn't generate the presentation right now. Please try again.",
            artifacts: [],
            images: [],
        };
    }
};
