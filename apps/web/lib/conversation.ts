import api from "./axios";
import type { Conversation } from "../store/conversation.store";
import { ApiError, unwrapList, unwrapObject } from "./errors";

export interface ArtifactFile {
    name: string;
    content: string;
}

export interface Artifact {
    id: string;
    type: string;
    title?: string;
    files: ArtifactFile[];
}

export interface Message {
    _id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    images?: string[];
    artifacts?: Artifact[];
    createdAt: string;
}

export type AgentName = "auto" | "chat" | "search" | "ppt" | "pdf" | "coding" | "imageGen" | "pdfRag" | "imageRag";

function requireId(value: string, field: string): void {
    if (!value || typeof value !== "string" || value.trim() === "") {
        throw new ApiError(`${field} is required`, { code: "VALIDATION_ERROR" });
    }
}

export const createConversation = async (): Promise<Conversation> => {
    const { data } = await api.post<Conversation>("/chat/conversation");
    return unwrapObject<Conversation>(data);
};

export const getConversations = async (): Promise<Conversation[]> => {
    const { data } = await api.get<Conversation[] | { conversations: Conversation[] }>("/chat/conversations");
    return unwrapList<Conversation>(data, "conversations");
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    requireId(conversationId, "conversationId");
    const { data } = await api.get<Message[] | { messages: Message[] }>("/chat/messages", { params: { conversationId } });
    return unwrapList<Message>(data, "messages");
};

export const sendMessage = async (
    conversationId: string,
    prompt: string,
    agent: AgentName = "auto",
    file?: { url: string; mimeType: string; fileName: string },
) => {
    requireId(conversationId, "conversationId");
    if (!prompt || prompt.trim() === "") {
        throw new ApiError("Message cannot be empty", { code: "VALIDATION_ERROR" });
    }
    const { data } = await api.post<{
        response: string;
        images?: string[];
        artifacts?: Artifact[];
    }>("/agent/chat", { conversationId, prompt, agent, ...(file ? { file } : {}) }, {
        // File analysis downloads + multimodal inference can take minutes.
        timeout: 180_000,
    });

    if (!data || typeof data.response !== "string") {
        throw new ApiError("The assistant returned an empty response. Please try again.", {
            code: "EMPTY_RESPONSE",
        });
    }

    return {
        response: data.response,
        images: data.images ?? [],
        artifacts: data.artifacts ?? [],
    };
};

export interface Attachment {
    url: string;
    blobName: string;
    mimeType: string;
    fileName: string;
    size: number;
    expiresInHours?: number;
}

export const ALLOWED_UPLOAD_MIMES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export const MAX_UPLOAD_BYTES = 10_000_000; // 10 MB — mirrors the backend cap

function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
                reject(new ApiError("Couldn't read the file. Please try another.", { code: "FILE_READ_FAILED" }));
                return;
            }
            const base64 = result.includes(",") ? (result.split(",")[1] ?? "") : result;
            resolve(base64);
        };
        reader.onerror = () => reject(new ApiError("Couldn't read the file. Please try another.", { code: "FILE_READ_FAILED" }));
        reader.readAsDataURL(file);
    });
}

/** Upload an image or PDF for document / image Q&A. Returns storage metadata. */
export const uploadAttachment = async (file: File): Promise<Attachment> => {
    if (!(ALLOWED_UPLOAD_MIMES as readonly string[]).includes(file.type)) {
        throw new ApiError("Only PNG, JPEG, WebP images and PDFs are supported.", { code: "VALIDATION_ERROR" });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new ApiError("File exceeds the 10 MB upload limit.", { code: "FILE_TOO_LARGE" });
    }
    if (file.size === 0) {
        throw new ApiError("The selected file is empty.", { code: "VALIDATION_ERROR" });
    }
    const data = await readAsBase64(file);
    const { data: res } = await api.post<{ file: Attachment }>("/agent/upload", {
        fileName: file.name,
        mimeType: file.type,
        data,
    });
    if (!res?.file?.url) {
        throw new ApiError("Upload failed. Please try again.", { code: "UPLOAD_FAILED" });
    }
    return res.file;
};

export const saveMessage = async (conversationId: string, role: Message["role"], content: string): Promise<Message> => {
    requireId(conversationId, "conversationId");
    const { data } = await api.post<Message>("/chat/message", { conversationId, role, content });
    return unwrapObject<Message>(data);
};

export const updateConversation = async (conversationId: string, title: string): Promise<Conversation> => {
    requireId(conversationId, "conversationId");
    const { data } = await api.put<Conversation>("/chat/conversation", { conversationId, title });
    return unwrapObject<Conversation>(data);
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
    requireId(conversationId, "conversationId");
    await api.delete("/chat/conversation", { data: { conversationId } });
};
