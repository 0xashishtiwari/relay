"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useUserStore } from "../store/user.store";
import { getCurrentUser } from "../lib/auth";
import {
  PLANS,
  PLAN_ORDER,
  createOrder,
  verifyPayment,
  loadRazorpayScript,
  toStoreUser,
  type PlanId,
  type VerifyPaymentUser,
} from "../lib/billing";

interface BillingDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function BillingDrawer({ open, onClose }: BillingDrawerProps) {
  const shouldReduce = useReducedMotion();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Preload Razorpay SDK when the drawer opens, so tapping Buy never
  // flashes or stalls while checkout.js downloads.
  useEffect(() => {
    if (!open) return;
    loadRazorpayScript().catch(() => {
      // Ignored — retried on Buy with a visible error if it still fails.
    });
  }, [open ]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingPlan) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, pendingPlan]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  const plan = (user?.plan ?? "free") as PlanId;
  const credits = user?.credits ?? 0;
  const totalCredits = user?.totalCredits ?? Math.max(credits, 100);
  const usagePct = useMemo(() => {
    if (!totalCredits || totalCredits <= 0) return 0;
    return Math.min(100, Math.round((credits / totalCredits) * 100));
  }, [credits, totalCredits]);

  const planExpiryLabel = useMemo(() => {
    if (!user?.planExpiry) return null;
    const d = new Date(user.planExpiry);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }, [user?.planExpiry]);

  const refreshUser = async () => {
    try {
      const fresh = await getCurrentUser();
      if (fresh) setUser(fresh);
    } catch {
      // Non-fatal — credits refresh failed, payment itself succeeded.
    }
  };

  const handleBuy = async (planId: PlanId) => {
    setError("");
    if (planId === "free") {
      toast.info("You're already on the Free plan.");
      return;
    }
    if (pendingPlan) return;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      setError("Razorpay key is missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID in apps/web/.env and restart.");
      return;
    }

    try {
      setPendingPlan(planId);

      // 1. Load Razorpay checkout
      await loadRazorpayScript();

      // 2. Create order on backend (via gateway -> billing service)
      const { order } = await createOrder(planId);

      if (!window.Razorpay) throw new Error("Razorpay failed to initialise");

      // 3. Open Razorpay checkout — capture the verified user so the
      // store updates instantly instead of waiting on a refetch.
      // Snapshot host styles: Razorpay mutates body/html inline styles and
      // doesn't always restore them, which flashes a white background over
      // the dark theme. We restore them when checkout closes.
      let verifiedUser: VerifyPaymentUser | null | undefined;
      const prevBodyCss = document.body.style.cssText;
      const prevHtmlClass = document.documentElement.className;
      try {
        await new Promise<void>((resolve, reject) => {
          const rzpFull = new window.Razorpay!({
            key: keyId,
            amount: order.amount,
            currency: order.currency || "INR",
            name: "Relay",
            description: `${PLANS[planId].name} — ${PLANS[planId].credits} credits`,
            order_id: order.id,
            prefill: { name: user?.name ?? "", email: user?.email ?? "" },
            theme: { color: "#3ECF8E", backdrop_color: "#000000" },
            handler: (response: unknown) => {
              const r = response as {
                razorpay_order_id: string;
                razorpay_payment_id: string;
                razorpay_signature: string;
              };
              verifyPayment({
                razorpay_order_id: r.razorpay_order_id,
                razorpay_payment_id: r.razorpay_payment_id,
                razorpay_signature: r.razorpay_signature,
              })
                .then((result) => {
                  verifiedUser = result.user;
                  resolve();
                })
                .catch((e) => reject(e));
            },
            modal: {
              backdropclose: false,
              escape: true,
              handleback: true,
              ondismiss: () => reject(new Error("Payment window closed before completion.")),
            },
          });
          rzpFull.on("payment.failed", (err: unknown) => reject(err));
          rzpFull.open();
        });
      } finally {
        document.body.style.cssText = prevBodyCss;
        document.documentElement.className = prevHtmlClass;
      }

      // Instant store update — this is what re-renders sidebar + drawer.
      const nextUser = verifiedUser ? toStoreUser(verifiedUser, user) : null;
      if (nextUser) {
        setUser(nextUser);
      } else {
        await refreshUser();
      }
      toast.success(`${PLANS[planId].name} activated`, {
        description: `${PLANS[planId].credits} credits added to your account.`,
      });
      onClose();
    } catch (e: unknown) {
      const axiosMsg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const msg =
        axiosMsg ||
        (e instanceof Error ? e.message : "Payment failed. Try again.");
      // User-dismissed checkout is not an error worth a red banner.
      if (msg.includes("closed before completion")) {
        setPendingPlan(null);
        return;
      }
      console.error("Billing payment failed:", e);
      setError(msg);
      toast.error("Payment failed", { description: msg });
    } finally {
      setPendingPlan(null);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="billing-drawer" className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Billing">
          {/* Overlay */}
          <motion.button
            type="button"
            aria-label="Close billing"
            onClick={() => !pendingPlan && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />
          {/* Panel */}
          <motion.aside
            initial={shouldReduce ? { opacity: 0 } : { x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={shouldReduce ? { opacity: 0 } : { x: "100%", opacity: 0.6 }}
            transition={{ duration: shouldReduce ? 0.12 : 0.24, ease }}
            className="absolute inset-y-0 right-0 flex w-[min(100vw,400px)] flex-col border-l border-border bg-card text-foreground shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-4">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight">Billing</h2>
                <p className="font-mono text-[11px] text-muted-foreground">Credits & plans</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={!!pendingPlan}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
              {/* Current usage */}
              <div className="rounded-lg border bg-secondary/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border bg-card px-2.5 py-1 font-mono text-[11px] font-medium capitalize">
                    {PLANS[plan]?.name ?? plan}
                  </span>
                  {planExpiryLabel && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Renews {planExpiryLabel}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-[22px] font-semibold tracking-tight">
                    {credits.toLocaleString()}
                    <span className="ml-1 text-[12px] font-normal text-muted-foreground">
                      / {totalCredits.toLocaleString()} credits
                    </span>
                  </p>
                  <span className="font-mono text-[11px] text-muted-foreground">{usagePct}% left</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="mt-2 truncate text-[11px] text-muted-foreground">
                  {user?.email ?? "Sign in to sync usage"}
                </p>
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
                  {error}
                  <button type="button" onClick={() => setError("")} className="ml-2 underline">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Plans */}
              <p className="mb-2 mt-5 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
                PLANS
              </p>
              <div className="space-y-2">
                {PLAN_ORDER.map((planId) => {
                  const p = PLANS[planId];
                  const isCurrent = planId === plan;
                  const isPending = pendingPlan === planId;
                  const isFree = p.amount === 0;
                  return (
                    <div
                      key={planId}
                      className={`rounded-lg border p-3.5 transition-colors ${
                        isCurrent ? "border-primary/60 bg-primary/[0.04]" : "bg-card hover:border-ring"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-semibold">{p.name}</p>
                          <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{p.description}</p>
                        </div>
                        {isCurrent && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-medium text-primary-foreground">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <span className="rounded border bg-secondary px-1.5 py-0.5">
                          {p.credits.toLocaleString()} credits
                        </span>
                        <span className="rounded border bg-secondary px-1.5 py-0.5">
                          {p.validity} days
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[15px] font-semibold tracking-tight">
                          {isFree ? "Free" : `₹${p.amount.toLocaleString("en-IN")}`}
                        </p>
                        {isCurrent ? (
                          <span className="font-mono text-[11px] text-muted-foreground">Active plan</span>
                        ) : isFree ? (
                          <span className="font-mono text-[11px] text-muted-foreground">Included by default</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuy(planId)}
                            disabled={!!pendingPlan}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isPending ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-3 w-3 animate-spin rounded-full border border-primary-foreground/30 border-t-primary-foreground" />
                                Processing…
                              </span>
                            ) : (
                              `Buy ${p.name.replace(" Plan", "")}`
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 font-mono text-[11px] leading-5 text-muted-foreground">
                Payments are secured by Razorpay (UPI, cards, netbanking). Credits are added
                instantly after verification.
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
