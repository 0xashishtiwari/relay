import type { NextFunction, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import Conversation from '../models/conversation.model';
import Message from '../models/message.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';

const VALID_ROLES = ["user", "assistant"] as const;

function requireUserId(req: Request, next: NextFunction): string | null {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
        next(new AppError(400, "User ID is required", "VALIDATION_ERROR"));
        return null;
    }
    return userId;
}

function requireObjectId(value: unknown, field: string, next: NextFunction): string | null {
    if (typeof value !== "string" || !isValidObjectId(value)) {
        next(new AppError(400, `${field} must be a valid id`, "INVALID_ID"));
        return null;
    }
    return value;
}

export const createConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = requireUserId(req, next);
    if (!userId) return;

    const conversation = await Conversation.create({ userId });
    res.status(201).json({ success: true, ...conversation.toObject() });
});


export const getConversations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = requireUserId(req, next);
    if (!userId) return;

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(limit);
    res.status(200).json({ success: true, conversations });
});

export const updateConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = requireUserId(req, next);
    if (!userId) return;

    const { conversationId, title } = req.body ?? {};
    const validId = requireObjectId(conversationId, "conversationId", next);
    if (!validId) return;

    const normalizedTitle = typeof title === "string"
        ? title.trim().replace(/\s+/g, " ")
        : "";

    if (!normalizedTitle) {
        return next(new AppError(400, "title is required", "VALIDATION_ERROR"));
    }

    const shortTitle = normalizedTitle.length > 60
        ? `${normalizedTitle.slice(0, 57)}...`
        : normalizedTitle;

    // Ownership check: only the owner can rename.
    const conversation = await Conversation.findOneAndUpdate(
        { _id: validId, userId },
        { title: shortTitle },
        { new: true },
    );
    if (!conversation) {
        return next(new AppError(404, "Conversation not found", "CONVERSATION_NOT_FOUND"));
    }

    res.status(200).json({ success: true, ...conversation.toObject() });
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = requireUserId(req, next);
    if (!userId) return;

    const { conversationId } = req.body ?? {};
    const validId = requireObjectId(conversationId, "conversationId", next);
    if (!validId) return;

    const conversation = await Conversation.findOneAndDelete({ _id: validId, userId });
    if (!conversation) {
        return next(new AppError(404, "Conversation not found", "CONVERSATION_NOT_FOUND"));
    }

    // Cascade-delete orphaned messages.
    await Message.deleteMany({ conversationId: validId }).catch((err) => {
        console.error("Failed to cascade-delete messages:", err);
    });

    res.status(200).json({ success: true, message: "Conversation deleted successfully" });
});

export const saveMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = requireUserId(req, next);
    if (!userId) return;

    const { conversationId, role, content, images, artifacts } = req.body ?? {};

    const validId = requireObjectId(conversationId, "conversationId", next);
    if (!validId) return;
    if (!(VALID_ROLES as readonly string[]).includes(role)) {
        return next(new AppError(400, `role must be one of: ${VALID_ROLES.join(", ")}`, "VALIDATION_ERROR"));
    }
    if (typeof content !== "string" || content.trim() === "") {
        return next(new AppError(400, "content is required", "VALIDATION_ERROR"));
    }
    if (content.length > 100_000) {
        return next(new AppError(400, "content exceeds maximum length of 100000 characters", "VALIDATION_ERROR"));
    }

    // Ownership check before writing.
    const conversation = await Conversation.findOne({ _id: validId, userId }).select("_id");
    if (!conversation) {
        return next(new AppError(404, "Conversation not found", "CONVERSATION_NOT_FOUND"));
    }

    const message = await Message.create({
        conversationId: validId,
        role,
        content,
        images,
        artifacts
    });

    await Conversation.findByIdAndUpdate(validId, {
        updatedAt: new Date()
    });

    return res.status(201).json({ success: true, ...message.toObject() });
});

export const getMessages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = requireUserId(req, next);
    if (!userId) return;

    const conversationId = req.query.conversationId as string | undefined;
    const validId = requireObjectId(conversationId, "conversationId", next);
    if (!validId) return;

    const conversation = await Conversation.findOne({ _id: validId, userId }).select("_id");
    if (!conversation) {
        return next(new AppError(404, "Conversation not found", "CONVERSATION_NOT_FOUND"));
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const messages = await Message.find({ conversationId: validId }).sort({ createdAt: 1 }).limit(limit);
    return res.status(200).json({ success: true, messages });
});
