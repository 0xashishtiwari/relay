import type { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { agentGraph } from '../graph/graph';
import { addMessageToMemory } from '../config/memory';
import { AppError, asyncHandler } from '../middleware/error.middleware';

const VALID_AGENTS = ["auto", "chat", "search", "coding", "pdf", "ppt", "imageGen", "pdfRag", "imageRag"] as const;
const ALLOWED_FILE_MIMES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;

interface AttachedFile {
    url: string;
    mimeType: string;
    fileName: string;
}

function validateFile(file: unknown, agent: string, next: NextFunction): AttachedFile | null {
    if (file === undefined || file === null) {
        if (agent === "pdfRag" || agent === "imageRag") {
            next(new AppError(400, `A file attachment is required for the ${agent} agent`, "VALIDATION_ERROR"));
            return null;
        }
        return null;
    }
    if (typeof file !== "object") {
        next(new AppError(400, "file must be an object with url, mimeType and fileName", "VALIDATION_ERROR"));
        return null;
    }
    const { url, mimeType, fileName } = file as Record<string, unknown>;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
        next(new AppError(400, "file.url must be a valid http(s) URL", "VALIDATION_ERROR"));
        return null;
    }
    if (!(ALLOWED_FILE_MIMES as readonly string[]).includes(mimeType as string)) {
        next(new AppError(400, `file.mimeType must be one of: ${ALLOWED_FILE_MIMES.join(", ")}`, "VALIDATION_ERROR"));
        return null;
    }
    if (typeof fileName !== "string" || fileName.trim() === "") {
        next(new AppError(400, "file.fileName is required", "VALIDATION_ERROR"));
        return null;
    }
    return { url, mimeType: mimeType as string, fileName };
}

function mapDownstreamError(err: unknown, service: string): AppError {
    if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
            return new AppError(504, `${service} timed out. Please try again.`, "DOWNSTREAM_TIMEOUT");
        }
        const status = err.response?.status;
        if (!err.response) {
            return new AppError(502, `${service} is unavailable. Please try again.`, "DOWNSTREAM_UNAVAILABLE");
        }
        if (status === 400 || status === 404) {
            const msg = (err.response.data as { message?: string; error?: string })?.message
                ?? (err.response.data as { error?: string })?.error
                ?? `${service} rejected the request.`;
            return new AppError(status, msg, "DOWNSTREAM_REJECTED");
        }
        return new AppError(502, `${service} failed. Please try again.`, "DOWNSTREAM_ERROR");
    }
    return new AppError(500, "Agent failed to process the request.", "AGENT_FAILED");
}

export const agentController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string | undefined;
    const { prompt, conversationId, agent = "auto", file } = req.body ?? {};

    if (!userId) {
        return next(new AppError(401, "Unauthorized: missing user identity", "UNAUTHORIZED"));
    }
    if (typeof prompt !== "string" || prompt.trim() === "") {
        return next(new AppError(400, "prompt is required", "VALIDATION_ERROR"));
    }
    if (prompt.length > 50_000) {
        return next(new AppError(400, "prompt exceeds maximum length of 50000 characters", "VALIDATION_ERROR"));
    }
    if (typeof conversationId !== "string" || conversationId.trim() === "") {
        return next(new AppError(400, "conversationId is required", "VALIDATION_ERROR"));
    }
    if (!(VALID_AGENTS as readonly string[]).includes(agent)) {
        return next(new AppError(400, `agent must be one of: ${VALID_AGENTS.join(", ")}`, "VALIDATION_ERROR"));
    }
    const attachedFile = validateFile(file, agent, next);
    // validateFile calls next(err) on failure — stop here.
    if (file !== undefined && file !== null && !attachedFile) return;
    const fileType = attachedFile
        ? (attachedFile.mimeType === "application/pdf" ? "pdf" : "image")
        : undefined;

    const chatServiceUrl = process.env.CHAT_SERVICE_URL;
    if (!chatServiceUrl) {
        return next(new AppError(500, "Chat service is not configured", "CONFIG_ERROR"));
    }

    // Persist the user turn. Attachments ride along so history renders:
    // images stay in the images array, PDFs as a download link in the text
    // (the chat reader picks both up on reload).
    const persistedUserContent = attachedFile && fileType === "pdf"
        ? `${prompt}\n\n[📄 ${attachedFile.fileName}](${attachedFile.url})`
        : prompt;
    const persistedUserImages = attachedFile && fileType === "image" ? [attachedFile.url] : [];

    try {
        await axios.post(`${chatServiceUrl}/message`, {
            conversationId,
            role: "user",
            content: persistedUserContent,
            ...(persistedUserImages.length > 0 ? { images: persistedUserImages } : {}),
        }, {
            timeout: 15_000,
            headers: { "x-user-id": userId },
        });
    } catch (err) {
        return next(mapDownstreamError(err, "Chat service"));
    }

    let result: { aiResponse?: unknown; images?: string[]; artifacts?: unknown[] };
    try {
        result = await agentGraph.invoke({
            prompt,
            conversationId,
            agent,
            userId,
            ...(attachedFile
                ? {
                    fileUrl: attachedFile.url,
                    fileType,
                    fileName: attachedFile.fileName,
                    mimeType: attachedFile.mimeType,
                }
                : {}),
        });
    } catch (err) {
        console.error("Agent graph invocation failed:", err);
        return next(mapGraphError(err));
    }

    const response = typeof result.aiResponse === 'string' && result.aiResponse.trim() !== ""
        ? result.aiResponse
        : 'The agent did not return a response. Please try again.';

    try {
        await addMessageToMemory(conversationId, "user", prompt);
        await addMessageToMemory(conversationId, "assistant", response);
    } catch (memoryError) {
        console.warn("Agent memory update failed; continuing with response:", memoryError);
    }

    try {
        await axios.post(`${chatServiceUrl}/message`, {
            conversationId,
            role: "assistant",
            content: response,
            images: result.images || [],
            artifacts: result?.artifacts || []
        }, {
            timeout: 15_000,
            headers: { "x-user-id": userId },
        });
    } catch (err) {
        // The answer was generated; persisting it failed. Return the answer with
        // a warning flag instead of a hard 500 so the user doesn't lose output.
        console.error("Failed to persist assistant message:", err);
        return res.status(200).json({
            success: true,
            warning: "Response generated but could not be saved to history. Retrying may duplicate it.",
            response,
            images: result.images || [],
            artifacts: result.artifacts || [],
        });
    }

    return res.status(200).json({
        success: true,
        response,
        images: result.images || [],
        artifacts: result.artifacts || [],
    });
});

function mapGraphError(err: unknown): AppError {
    const message = err instanceof Error ? err.message : "";
    if (/insufficient|credit/i.test(message)) {
        return new AppError(402, "Insufficient credits for this request.", "INSUFFICIENT_CREDITS");
    }
    if (/rate.?limit|429/i.test(message)) {
        return new AppError(429, "Model rate limit reached. Please wait and retry.", "RATE_LIMITED");
    }
    if (/timeout|timed out|ETIMEDOUT|ECONNABORTED/i.test(message)) {
        return new AppError(504, "The AI model timed out. Please try again.", "MODEL_TIMEOUT");
    }
    console.error("Error in agent controller:", err);
    return new AppError(500, "Agent failed to process the request. Please try again.", "AGENT_FAILED");
}
