import mongoose, { Schema, model, Document } from 'mongoose';

const messageSchema = new Schema({

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],

    },
    content: {
        type: String,
        required: true
    },
    images: {
        type: [String],
        default: []
    }

}, { timestamps: true });

const Message = model('Message', messageSchema);

export default Message;