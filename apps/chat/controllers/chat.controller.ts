import type { Request, Response } from 'express';
import Conversation from '../models/conversation.model';
import Message from '../models/message.model';


export const createConversation = async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'] as string;

        console.log("User ID from header:", userId);

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const conversation = await Conversation.create({ userId });
        res.status(201).json(conversation);

    } catch (err) {
        console.error("Error creating conversation:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


export const getConversations = async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'] as string;

        console.log("User ID from header:", userId);

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const conversation = await Conversation.find({ userId }).sort({ updatedAt: -1 });
        res.status(201).json(conversation);

    } catch (err) {
        console.error("Error fetching conversation:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const updateConversation = async (req: Request, res: Response) => {
    try {
        const { conversationId, title } = req.body;
        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required" });
        }

        const conversation = await Conversation.findByIdAndUpdate(conversationId, { title }, { new: true });
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        res.status(200).json(conversation);

    } catch (err) {
        console.error("Error updating conversation:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const deleteConversation = async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.body;

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required" });
        }

        const conversation = await Conversation.findByIdAndDelete(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        res.status(200).json({ message: "Conversation deleted successfully" });

    } catch (err) {
        console.error("Error deleting conversation:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const saveMessage = async (req: Request, res: Response) => {
    try {

        const { conversationId, role, content } = req.body;

        if (!conversationId || !role || !content) {
            return res.status(400).json({ error: "conversationId, role and content are required" });
        }
        const message = await Message.create({
            conversationId,
            role,
            content
        })

        return res.status(201).json(message);

    } catch (err) {
        console.error("Error saving message:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.body;

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required" });
        }

        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
        return res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }

}

