import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
    userId: string;
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    credits: number;
    plan: string;
    status: 'pending' | 'completed' | 'failed';
}

const paymentSchema = new Schema({
    userId: { type: String, required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    credits: { type: Number, required: true },
    plan: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'completed', 'failed'], default: 'pending' },

}, {
    timestamps: true
});


export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);