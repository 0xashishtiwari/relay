"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import api from "../../lib/axios";
import { getCurrentUser } from "../../lib/auth";
import { useUserStore } from "../../store/user.store";
import ThemeToggle from "../../components/theme-toggle";

const ease = [0.16, 1, 0.3, 1] as const;

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUser(user);
          router.replace("/chat");
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router, setUser]);

  const handleLogin = async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.post("/auth/login", { token });
      const user = await getCurrentUser();
      localStorage.setItem("justLoggedIn", "true");
      setUser(user);
      setSuccess(true);
      setTimeout(() => router.replace("/chat"), 420);
    } catch {
      setError("Unable to sign you in. Please try again.");
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await handleLogin(token);
    } catch (err: any) {
      // Ignore popup closed
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      setError("Unable to sign you in. Please try again.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-border border-t-foreground"
        />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* subtle background — barely visible */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_30%,black_35%,transparent_70%)] dark:opacity-[0.07]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_900px_420px_at_50%_0%,var(--accent)_0%,transparent_62%)] opacity-[0.55] dark:opacity-[0.18]" />
      </div>

      {/* theme — quiet corner */}
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* center stack */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mb-8 text-center"
          >
            <Link href="/" className="inline-flex flex-col items-center gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight">Relay</span>
              <span className="font-mono text-[11px] tracking-wide text-muted-foreground">Multi-agent AI workspace</span>
            </Link>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease, delay: 0.06 }}
            className="rounded-xl border bg-card px-6 py-7 shadow-sm sm:px-8 sm:py-8"
          >
            {/* Heading */}
            <div className="text-center">
              <h1 className="text-[28px] font-medium leading-none tracking-[-0.03em] sm:text-[30px]">Welcome to Relay</h1>
              <p className="mt-2.5 text-[13.5px] leading-6 text-muted-foreground">Your AI workspace for every kind of work.</p>
            </div>

            {/* Google */}
            <div className="mt-7">
              <motion.button
                type="button"
                onClick={googleLogin}
                disabled={loading || success}
                whileHover={!loading && !success ? { y: -1 } : undefined}
                whileTap={!loading && !success ? { scale: 0.99 } : undefined}
                transition={{ duration: 0.14, ease }}
                className="group flex h-[50px] w-full items-center justify-center gap-3 rounded-md border bg-card px-4 text-[13.5px] font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-100"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {loading || success ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-2.5"
                    >
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                      {success ? "Welcome to Relay" : "Signing you in..."}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                        <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.23a4.47 4.47 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.21z" />
                        <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.52A9.75 9.75 0 0 0 12 21.7z" />
                        <path fill="#FBBC05" d="M6.51 13.78a5.86 5.86 0 0 1 0-3.56V7.7H3.27a9.75 9.75 0 0 0 0 8.6l3.24-2.52z" />
                        <path fill="#EA4335" d="M12 6.18c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.25 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.73 5.4l3.24 2.52C7.29 7.9 9.45 6.18 12 6.18z" />
                      </svg>
                      Continue with Google
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.22, ease }}
                    className="mt-3 rounded-md border border-destructive/15 bg-destructive/5 px-3 py-2 text-center text-xs leading-5 text-destructive"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
                By continuing, you agree to Relay&apos;s{" "}
                <a href="#" className="underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground transition-colors">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground transition-colors">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </motion.div>

          {/* Product context */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="mt-6 text-center text-xs text-muted-foreground"
          >
            One conversation. Multiple specialized agents.
          </motion.p>

          {/* Subtle routing indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-7 flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground/55"
            aria-hidden="true"
          >
            {["Chat", "Search", "Code", "Create"].map((label, i) => (
              <span key={label} className="flex items-center gap-1.5">
                <motion.span
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
                >
                  {label}
                </motion.span>
                {i < 3 && <span className="text-border">→</span>}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="pointer-events-none pb-6 text-center font-mono text-[11px] text-muted-foreground/60"
      >
        © {new Date().getFullYear()} Relay
      </motion.p>
    </main>
  );
}
