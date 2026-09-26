import axios from "axios";
import { agentState } from "../graph/state";
import { getModel } from "../config/llmModels";
import { deductCredits } from "../utils/deductCredits";
import { responseToText } from "../utils/llmResponse";

const MAX_PDF_BYTES = 10_000_000; // 10 MB — Gemini inline-data limit

const SYSTEM_PROMPT = `You are a document Q&A agent. The user uploaded a PDF (attached inline) and asks questions about it.
- Answer ONLY from the document's contents. Quote relevant excerpts when useful.
- If the question cannot be answered from the document, say so explicitly.
- Be concise but complete. Use markdown formatting with headings and bullet points where helpful.`;

export const pdfRagAgent = async (state: typeof agentState.State) => {
    try {
        if (!state.fileUrl) {
            return {
                ...state,
                aiResponse: "No PDF was attached. Please upload a PDF and ask your question again.",
                artifacts: [],
                images: [],
            };
        }

        // Pull the bytes server-side (SAS URL) so the model gets inline data.
        let pdfBase64: string;
        try {
            const head = await axios.head(state.fileUrl, { timeout: 10_000 }).catch(() => null);
            const declared = Number(head?.headers?.["content-length"]);
            if (Number.isFinite(declared) && declared > MAX_PDF_BYTES) {
                throw new Error("PDF exceeds the 10 MB analysis limit");
            }
            const { data } = await axios.get<ArrayBuffer>(state.fileUrl, {
                responseType: "arraybuffer",
                timeout: 30_000,
                maxContentLength: MAX_PDF_BYTES + 1_000_000,
            });
            const buffer = Buffer.from(data);
            if (buffer.length > MAX_PDF_BYTES) {
                throw new Error("PDF exceeds the 10 MB analysis limit");
            }
            pdfBase64 = buffer.toString("base64");
        } catch (err) {
            console.error("pdfRag: failed to fetch PDF:", err instanceof Error ? err.message : err);
            return {
                ...state,
                aiResponse: "I couldn't read the uploaded PDF (it may have expired or is too large). Please upload it again.",
                artifacts: [],
                images: [],
            };
        }

        const llm = await getModel("pdfRag");

        const response = await llm.invoke([
            ["system", SYSTEM_PROMPT],
            [
                "user",
                [
                    { type: "application/pdf", data: pdfBase64 },
                    { type: "text", text: state.prompt },
                ],
            ],
        ]);

        const answer = responseToText(response.content).trim();
        if (!answer) {
            throw new Error("Model returned an empty response");
        }

        await deductCredits(state.userId, "pdfRag");

        return {
            ...state,
            aiResponse: answer,
            artifacts: [],
            images: [],
        };
    } catch (error) {
        console.error("Error in pdfRagAgent:", error);
        const message = error instanceof Error ? error.message : "";
        if (/insufficient|credit/i.test(message) || (error as { statusCode?: number })?.statusCode === 402) {
            throw error;
        }
        return {
            ...state,
            aiResponse: "I ran into an error analyzing the PDF. Please try again.",
            artifacts: [],
            images: [],
        };
    }
};
