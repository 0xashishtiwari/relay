import mongoose, { Schema, model } from 'mongoose';

const filesSchema = new Schema({
    name: String,
    content: String
}, {
    _id: false
});

const artifactSchema = new Schema({
    id: String,
    type: String,
    title: String,
    files: [filesSchema]
}, {
    _id: false
})

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
    },
        artifacts: {
        type: [artifactSchema],
        default: []
    }

}, { timestamps: true });

const Message = model('Message', messageSchema);

export default Message;