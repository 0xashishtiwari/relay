import axios from "axios";
import { agentState } from "../graph/state";
import { getModel } from "../config/llmModels";
import { deductCredits } from "../utils/deductCredits";
import { responseToText } from "../utils/llmResponse";

const MAX_IMAGE_BYTES = 10_000_000; // 10 MB

const SYSTEM_PROMPT = `You are an image Q&A agent. The user uploaded an image (attached) and asks questions about it.
- Describe and reason about ONLY what is visible in the image. Quote visible text exactly when relevant.
- If something cannot be determined from the image, say so explicitly.
- Be concise but complete. Use markdown formatting where helpful.`;

export const imageRagAgent = async (state: typeof agentState.State) => {
    try {
        if (!state.fileUrl) {
            return {
                ...state,
                aiResponse: "No image was attached. Please upload an image and ask your question again.",
                artifacts: [],
                images: [],
            };
        }

        // This provider build only accepts images as base64 data URLs
        // (remote URLs are rejected), so pull the bytes server-side.
        let imageDataUrl: string;
        try {
            const head = await axios.head(state.fileUrl, { timeout: 10_000 }).catch(() => null);
            const declared = Number(head?.headers?.["content-length"]);
            if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
                throw new Error("Image exceeds the 10 MB analysis limit");
            }
            const mimeType = state.mimeType?.startsWith("image/")
                ? state.mimeType
                : "image/jpeg";
            const { data } = await axios.get<ArrayBuffer>(state.fileUrl, {
                responseType: "arraybuffer",
                timeout: 30_000,
                maxContentLength: MAX_IMAGE_BYTES + 1_000_000,
            });
            const buffer = Buffer.from(data);
            if (buffer.length > MAX_IMAGE_BYTES) {
                throw new Error("Image exceeds the 10 MB analysis limit");
            }
            imageDataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
        } catch (err) {
            console.error("imageRag: failed to fetch image:", err instanceof Error ? err.message : err);
            return {
                ...state,
                aiResponse: "I couldn't read the uploaded image (it may have expired or is too large). Please upload it again.",
                artifacts: [],
                images: [],
            };
        }

        const llm = await getModel("imageRag");

        const response = await llm.invoke([
            ["system", SYSTEM_PROMPT],
            [
                "user",
                [
                    { type: "text", text: state.prompt },
                    { type: "image_url", image_url: imageDataUrl },
                ],
            ],
        ]);

        const answer = responseToText(response.content).trim();
        if (!answer) {
            throw new Error("Model returned an empty response");
        }

        await deductCredits(state.userId, "imageRag");

        return {
            ...state,
            aiResponse: answer,
            artifacts: [],
            // Echo the analyzed image so it renders on the assistant message.
            images: [state.fileUrl],
        };
    } catch (error) {
        console.error("Error in imageRagAgent:", error);
        const message = error instanceof Error ? error.message : "";
        if (/insufficient|credit/i.test(message) || (error as { statusCode?: number })?.statusCode === 402) {
            throw error;
        }
        return {
            ...state,
            aiResponse: "I ran into an error analyzing the image. Please try again.",
            artifacts: [],
            images: [],
        };
    }
};
