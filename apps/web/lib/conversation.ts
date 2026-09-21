import api from "./axios";
import type { Conversation } from "../store/conversation.store";

export interface Message {
    _id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
}

export const createConversation = async (): Promise<Conversation> => {
    const { data } = await api.post<Conversation>("/chat/conversation");
    return data;
};

export const getConversations = async (): Promise<Conversation[]> => {
    const { data } = await api.get<Conversation[]>("/chat/conversations");
    return data;
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const { data } = await api.get<Message[]>("/chat/messages", {
        params: { conversationId },
    });
    return data;
};

export const sendMessage = async (conversationId: string, prompt: string) => {
    const { data } = await api.post<{ response: string }>("/agent/chat", {
        conversationId,
        prompt,
    });
    return data.response;
};

export const saveMessage = async (
    conversationId: string,
    role: Message["role"],
    content: string,
): Promise<Message> => {
    const { data } = await api.post<Message>("/chat/message", {
        conversationId,
        role,
        content,
    });
    return data;
};


export const updateConversation = async (conversationId: string, title: string): Promise<Conversation> => {
    const { data } = await api.put<Conversation>("/chat/conversation", {
        conversationId,
        title,
    });
    return data;
};