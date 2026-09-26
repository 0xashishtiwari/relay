import api from "./axios";
import { User } from "../types/user";
import { ApiError } from "./errors";

export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  amount: number;
  credits: number;
  validity: number;
  description: string;
}

// Mirrors apps/billing/config/plans.ts — keep in sync with backend.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free Plan",
    amount: 0,
    credits: 100,
    validity: 30,
    description: "Get started with 100 credits to explore Relay.",
  },
  starter: {
    id: "starter",
    name: "Starter Plan",
    amount: 499,
    credits: 500,
    validity: 30,
    description: "Perfect for individuals and small teams getting started.",
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    amount: 999,
    credits: 1000,
    validity: 30,
    description: "For larger teams and businesses with growing needs.",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro"];

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export const createOrder = async (plan: PlanId): Promise<{ order: RazorpayOrder; plan: Plan }> => {
  if (!plan || !(plan in PLANS)) {
    throw new ApiError("Please select a valid plan.", { code: "VALIDATION_ERROR" });
  }
  if (plan === "free") {
    throw new ApiError("The free plan cannot be purchased.", { code: "VALIDATION_ERROR" });
  }
  const res = await api.post("/billing/createOrder", { plan });
  if (!res.data?.order?.id) {
    throw new ApiError("Failed to create the payment order. Please try again.", { code: "ORDER_FAILED" });
  }
  return res.data;
};

export interface VerifyPaymentUser {
  _id?: string;
  userId?: string;
  name?: string;
  email?: string;
  avatar?: string;
  plan?: "free" | "starter" | "pro";
  credits?: number;
  totalCredits?: number;
  planExpiry?: string | null;
}

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ message: string; user?: VerifyPaymentUser | null; payment?: { orderId: string; plan: string; credits: number } }> => {
  const res = await api.post("/billing/verifyPayment", payload);
  return res.data;
};

/** Normalize backend user shapes (mongoose `_id` vs session `userId`) into the store User. */
export const toStoreUser = (raw: VerifyPaymentUser, fallback: User | null): User | null => {
  const userId = raw.userId ?? raw._id ?? fallback?.userId;
  if (!userId) return null;
  return {
    userId,
    name: raw.name ?? fallback?.name ?? "",
    email: raw.email ?? fallback?.email ?? "",
    avatar: raw.avatar ?? fallback?.avatar ?? "",
    plan: raw.plan ?? fallback?.plan ?? "free",
    credits: raw.credits ?? fallback?.credits ?? 0,
    totalCredits: raw.totalCredits ?? fallback?.totalCredits ?? raw.credits ?? 0,
    planExpiry: (raw.planExpiry as string | null | undefined) ?? fallback?.planExpiry ?? null,
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (err: unknown) => void) => void };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

export const loadRazorpayScript = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject(new ApiError("Payments are only available in the browser.", { code: "NO_WINDOW" }));
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new ApiError("Failed to load the payment window. Check your connection and try again.", { code: "SCRIPT_LOAD_FAILED" }));
    };
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
};
