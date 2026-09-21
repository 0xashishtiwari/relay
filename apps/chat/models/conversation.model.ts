import {Schema, model, Document} from 'mongoose';
import Message from './message.model';

const conversationSchema = new Schema({

    title: {
        type: String,
        default: 'New Conversation'
    },
    userId:{
        type : String,
        required: true
    }

}, {timestamps: true});

const Conversation = model('Conversation', conversationSchema);

export default Conversation;