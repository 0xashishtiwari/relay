import { redisClient } from "@repo/redis";
import { getMessages } from "../utils/getMessages";



function getKey(conversationId: string) {
    return `messages-${conversationId}`;
}

function safeParseArray(raw: string | null): Array<{ role: string; content: unknown }> {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn("Corrupt agent memory entry; ignoring:", err);
        return [];
    }
}

export const getMemory = async (conversationId: string, userId?: string) => {
    if (!conversationId || typeof conversationId !== "string") {
        throw new Error("conversationId is required to load memory");
    }
    const key = getKey(conversationId);

    const cached = await redisClient.get(key);
    if (cached) {
        const parsed = safeParseArray(cached);
        if (parsed.length > 0 || cached.trim() === "[]") {
            return parsed.map((message: any) => ({
                role: message.role,
                content: message.content ?? message.message,
            }));
        }
        // Corrupt entry: fall through to source of truth and overwrite.
    }

    const messages = await getMessages(conversationId, userId);

    await redisClient.setex(key, 60 * 60 * 24, JSON.stringify(messages));

    return messages;
}

export const addMessageToMemory = async (conversationId: string, role: string, message: any) => {
    if (!conversationId || typeof conversationId !== "string") {
        throw new Error("conversationId is required to update memory");
    }
    const key = getKey(conversationId);
    //storing the latest 20 messages in memory
    const rawMessages = await redisClient.get(key);
    const messages = safeParseArray(rawMessages);

    messages.push({ role, content: message });

    // Keep only the latest 20 messages
    while (messages.length > 20) {
        messages.shift();
    }

    await redisClient.setex(key, 60 * 60 * 24, JSON.stringify(messages));
}
