'use client';
import React, { useEffect, useState } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import api from "../../lib/axios";
import { getCurrentUser } from "../../lib/auth";
import { useUserStore } from "../../store/user.store";

const Page = () => {
  const [loading, setLoading] = useState(false);

  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUser(user);
        }
      } catch (error) {
        console.error("No active session or failed to fetch current user:", error);
        setUser(null); // Clear user state if there's no active session
      }
    };

    checkSession();
  }, [setUser]);


  const handleLogin = async (token: string) => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", {
        token
      });
      console.log(data);

      const user = await getCurrentUser();
      console.log("Current user after login:", user);
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
      // console.log(token);
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black text-white font-semibold text-lg mb-5">
            R
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Welcome to Relay
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Sign in to continue to your workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-7 shadow-sm">
          <button
            onClick={googleLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-all hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
            ) : (
              <svg
                width="18"
                height="18"
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

            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">SECURE ACCESS</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <p className="text-center text-xs leading-5 text-zinc-400">
            By continuing, you agree to Relay's Terms of Service and Privacy
            Policy.
          </p>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          © {new Date().getFullYear()} Relay
        </p>
      </div>
    </main>
  );
};

export default Page;