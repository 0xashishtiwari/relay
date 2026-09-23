import api from "./axios";
import type { Conversation } from "../store/conversation.store";

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

export type AgentName = "auto" | "chat" | "search" | "ppt" | "pdf" | "coding" | "imageGen";

export const createConversation = async (): Promise<Conversation> => {
    const { data } = await api.post<Conversation>("/chat/conversation");
    return data;
};

export const getConversations = async (): Promise<Conversation[]> => {
    const { data } = await api.get<Conversation[]>("/chat/conversations");
    return data;
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const { data } = await api.get<Message[]>("/chat/messages", { params: { conversationId } });
    return data;
};

export const sendMessage = async (conversationId: string, prompt: string, agent: AgentName = "auto") => {
    const { data } = await api.post<{
        response: string;
        images?: string[];
        artifacts?: Artifact[];
    }>("/agent/chat", { conversationId, prompt, agent });

    return {
        response: data.response,
        images: data.images ?? [],
        artifacts: data.artifacts ?? [],
    };
};

export const saveMessage = async (conversationId: string, role: Message["role"], content: string): Promise<Message> => {
    const { data } = await api.post<Message>("/chat/message", { conversationId, role, content });
    return data;
};

export const updateConversation = async (conversationId: string, title: string): Promise<Conversation> => {
    const { data } = await api.put<Conversation>("/chat/conversation", { conversationId, title });
    return data;
};
