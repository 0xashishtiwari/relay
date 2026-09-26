import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import axios from "axios";
import { PLANS } from "../config/plans";
import razorpay from "../config/razorpay";
import { Payment } from "../models/payment.model";
import { AppError, asyncHandler } from "../middleware/error.middleware";

export const createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { plan } = req.body ?? {};
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!userId) {
        return next(new AppError(401, "Unauthorized: missing user identity", "UNAUTHORIZED"));
    }
    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    if (!selectedPlan) {
        return next(new AppError(400, `Invalid plan selected. Must be one of: ${Object.keys(PLANS).join(", ")}`, "VALIDATION_ERROR"));
    }
    if (selectedPlan.amount === 0) {
        return next(new AppError(400, "The free plan cannot be purchased", "VALIDATION_ERROR"));
    }

    let order;
    try {
        order = await razorpay.orders.create({
            amount: selectedPlan.amount * 100, // smallest currency unit
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`,
        });
    } catch (err) {
        console.error("Razorpay create order failed:", err);
        return next(new AppError(502, "Payment provider unavailable. Please try again.", "PAYMENT_PROVIDER_ERROR"));
    }

    try {
        await Payment.create({
            userId,
            orderId: order.id,
            amount: selectedPlan.amount,
            currency: order.currency,
            credits: selectedPlan.credits,
            plan: selectedPlan.id,
            status: 'pending'
        });
    } catch (err) {
        console.error("Failed to persist payment record:", err);
        return next(new AppError(500, "Failed to record order. Please try again.", "DB_ERROR"));
    }

    return res.status(200).json({ success: true, order, plan: selectedPlan });
});


export const verifyPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};

    if (typeof razorpay_order_id !== "string" || !razorpay_order_id) {
        return next(new AppError(400, "razorpay_order_id is required", "VALIDATION_ERROR"));
    }
    if (typeof razorpay_payment_id !== "string" || !razorpay_payment_id) {
        return next(new AppError(400, "razorpay_payment_id is required", "VALIDATION_ERROR"));
    }
    if (typeof razorpay_signature !== "string" || !razorpay_signature) {
        return next(new AppError(400, "razorpay_signature is required", "VALIDATION_ERROR"));
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        console.error("RAZORPAY_KEY_SECRET is not configured");
        return next(new AppError(500, "Payment verification is not configured", "CONFIG_ERROR"));
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(razorpay_signature, "hex");
    const signaturesMatch =
        expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
        return next(new AppError(404, "Payment record not found", "PAYMENT_NOT_FOUND"));
    }

    if (!signaturesMatch) {
        // Persist the failure so it can't be silently retried into a success.
        if (payment.status !== "failed") {
            payment.status = "failed";
            await payment.save().catch((err) => console.error("Failed to mark payment failed:", err));
        }
        return next(new AppError(400, "Invalid payment signature", "INVALID_SIGNATURE"));
    }

    // Idempotency: a replayed webhook/verify must not double-credit the user.
    if (payment.status === "completed") {
        return res.status(200).json({
            success: true,
            message: "Payment already verified",
            payment: { orderId: payment.orderId, plan: payment.plan, credits: payment.credits },
            user: null,
        });
    }

    payment.paymentId = razorpay_payment_id;
    payment.status = 'completed';
    await payment.save();

    let updatedUser: unknown = null;
    try {
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE_URL}/updatePayment`,
            { userId: payment.userId, plan: payment.plan, credits: payment.credits },
            { timeout: 15_000 }
        );
        updatedUser = (data as { user?: unknown }).user ?? null;
    } catch (err) {
        // Payment is captured but the user was NOT credited — surface a 502 so the
        // client can retry verify (idempotent) instead of showing false success.
        console.error("Failed to sync payment to auth service:", err);
        return next(new AppError(
            502,
            "Payment captured but credit sync failed. Please retry verification — you will not be charged twice.",
            "CREDIT_SYNC_FAILED"
        ));
    }

    return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        payment: { orderId: payment.orderId, plan: payment.plan, credits: payment.credits },
        user: updatedUser
    });
});
