import { redisClient } from "@repo/redis";
import { getMessages } from "../utils/getMessages";



function getKey(conversationId: string) {
    return `messages-${conversationId}`;
}

export const getMemory = async (conversationId: string) => {
    const key = getKey(conversationId);

    const chached = await redisClient.get(key);
    if (chached) {
        return JSON.parse(chached).map((message: any) => ({
            role: message.role,
            content: message.content ?? message.message,
        }));
    }

    const messages = await getMessages(conversationId);
    
    await redisClient.setex(key, 60 * 60 * 24, JSON.stringify(messages));

    return messages;
}

export const addMessageToMemory = async (conversationId: string, role:string  , message: any) => {
    const key = getKey(conversationId);
    //storing the latest 20 messages in memory
    const rawMessages = await redisClient.get(key);
    const messages = rawMessages ? JSON.parse(rawMessages) : [];

    messages.push({ role, content: message });

    // Keep only the latest 20 messages
    if (messages.length > 20) {
        messages.shift();
    }

    await redisClient.setex(key, 60 * 60 * 24, JSON.stringify(messages));
}