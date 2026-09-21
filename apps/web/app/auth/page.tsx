"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import api from "../../lib/axios";
import { getCurrentUser } from "../../lib/auth";
import { useUserStore } from "../../store/user.store";
import Link from "next/link";

const Page = () => {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

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
      } catch (error) {
        console.error(
          "No active session or failed to fetch current user:",
          error
        );
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

      await api.post("/auth/login", {
        token,
      });

      const user = await getCurrentUser();

      setUser(user);
      router.replace("/chat");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      setLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      await handleLogin(token);
    } catch (error) {
      console.error("Google login failed:", error);
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT SIDE */}
        <section className="relative hidden flex-col justify-between border-r border-border px-10 py-9 lg:flex xl:px-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-9 w-9
                items-center justify-center
                rounded-lg
                bg-primary
                text-sm font-semibold
                text-primary-foreground
              "
            >
              R
            </div>

            <Link href="/" className="text-sm font-medium tracking-[-0.01em]">
              Relay
            </Link>
          </div>
            

          {/* Main copy */}
          <div className="max-w-[620px] pb-16">
            <p
              className="
                mb-6
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.22em]
                text-primary
              "
            >
              Workspace access
            </p>

            <h1
              className="
                max-w-[600px]
                text-[clamp(3.5rem,5.5vw,5.8rem)]
                font-medium
                leading-[0.95]
                tracking-[-0.065em]
                text-foreground
              "
            >
              Keep the work
              <br />
              moving.
            </h1>

            <p
              className="
                mt-8
                max-w-[440px]
                text-[16px]
                leading-7
                text-muted-foreground
              "
            >
              One focused place for conversations, decisions, research,
              and the AI agents that help you move them forward.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {/* <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Private workspace */}
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-[420px]">
            {/* Mobile brand */}
            <div className="mb-14 lg:hidden">
              <div
                className="
                  mb-5
                  flex h-10 w-10
                  items-center justify-center
                  rounded-lg
                  bg-primary
                  text-sm font-semibold
                  text-primary-foreground
                "
              >
                R
              </div>

              <p className="text-sm font-medium text-foreground">
                Relay
              </p>
            </div>

            {/* Heading */}
            <div className="mb-9">
              <p
                className="
                  mb-4
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-muted-foreground
                "
              >
                Sign in
              </p>

              <h2
                className="
                  text-[38px]
                  font-medium
                  leading-none
                  tracking-[-0.05em]
                  text-foreground
                  sm:text-[42px]
                "
              >
                Welcome back.
              </h2>

              <p className="mt-4 text-[14px] leading-6 text-muted-foreground">
                Continue to your Relay workspace.
              </p>
            </div>

            {/* Login surface */}
            <div
              className="
                border border-border
                bg-card
                p-6
                shadow-sm
                sm:p-7
              "
            >
              <button
                type="button"
                onClick={googleLogin}
                disabled={loading}
                className="
                  flex h-12 w-full
                  items-center justify-center gap-3
                  rounded-lg
                  border border-border
                  bg-background
                  text-[13px]
                  font-medium
                  text-foreground
                  transition-all duration-200
                  hover:bg-secondary
                  hover:border-ring/50
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  cursor-pointer
                "
              >
                {loading ? (
                  <div
                    className="
                      h-4 w-4
                      animate-spin
                      rounded-full
                      border-2 border-border
                      border-t-foreground
                    "
                  />
                ) : (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.23a4.47 4.47 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.21z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.52A9.75 9.75 0 0 0 12 21.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.51 13.78a5.86 5.86 0 0 1 0-3.56V7.7H3.27a9.75 9.75 0 0 0 0 8.6l3.24-2.52z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.18c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.25 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.73 5.4l3.24 2.52C7.29 7.9 9.45 6.18 12 6.18z"
                    />
                  </svg>
                )}

                <span>
                  {loading ? "Signing in..." : "Continue with Google"}
                </span>
              </button>

              {/* Divider */}
              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />

                <span
                  className="
                    text-[9px]
                    font-medium
                    uppercase
                    tracking-[0.18em]
                    text-muted-foreground
                  "
                >
                  Secure access
                </span>

                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Terms */}
              <p
                className="
                  text-center
                  text-[11px]
                  leading-5
                  text-muted-foreground
                "
              >
                By continuing, you agree to Relay&apos;s{" "}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>

            {/* Footer */}
            <p className="mt-7 text-center text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} Relay
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Page;