import type { Request, Response } from "express";
import {PLANS} from "../config/plans";
import razorpay from "../config/razorpay";
import { Payment } from "../models/payment.model";
import axios from "axios";

export const createOrder = async (req: Request, res: Response)=>{
    try{
        const {plan} = req.body;
        const userId = req.headers['x-user-id'] as string;
        if(!userId){
            return res.status(400).json({error: "Unauthorized: User ID not found in headers"});
        }
        const selectedPlan = PLANS[plan as keyof typeof PLANS];
        if(!selectedPlan){
            return res.status(400).json({error: "Invalid plan selected"});
        }

        const order = await razorpay.orders.create({
            amount : selectedPlan.amount * 100, // amount in the smallest currency unit
            currency : "INR",
            receipt : `receipt_order_${Date.now()}`,
        })

        await Payment.create({
            userId,
            orderId: order.id,
            amount: selectedPlan.amount,
            currency: order.currency,
            credits: selectedPlan.credits,
            plan: selectedPlan.id,
            status: 'pending'
        })

        return res.status(200).json({order , plan: selectedPlan});

    }catch(err){
        console.error("Error creating order:", err);
        return res.status(500).json({error: "Internal Server Error"});
    }
}


export const verifyPayment = async (req: Request, res: Response)=>{

    try{

        const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body;
        
        const generated_signature = require('crypto').
                                    createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
                                    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                                    .digest('hex');

        if(generated_signature !== razorpay_signature){
            return res.status(400).json({error: "Invalid signature"});
        }

        const payment = await Payment.findOne({orderId: razorpay_order_id});
        if(!payment){
            return res.status(404).json({error: "Payment record not found"});
        }

        payment.paymentId = razorpay_payment_id;
        payment.status = 'completed';
        await payment.save();

        let updatedUser: unknown = null;
        try{
            const { data } = await axios.post(`${process.env.AUTH_SERVICE_URL}/updatePayment`, {
                userId: payment.userId,
                plan: payment.plan,
                credits: payment.credits
            });
            updatedUser = (data as { user?: unknown }).user ?? null;
        }catch(err){
            console.error("Failed to sync payment to auth service:", err);
        }

        return res.status(200).json({
            message: "Payment verified successfully",
            payment: { orderId: payment.orderId, plan: payment.plan, credits: payment.credits },
            user: updatedUser
        });

    }catch(err){
        console.error("Error verifying payment:", err);
        return res.status(500).json({error: "Internal Server Error"});
    }

}