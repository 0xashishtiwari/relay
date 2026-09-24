"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Artifact from "../../components/chat/Artifact";
import ChatArea from "../../components/chat/chatArea";
import Sidebar from "../../components/chat/sidebar";
import { getCurrentUser } from "../../lib/auth";
import { useUserStore } from "../../store/user.store";
import { Conversation, useConversationStore } from "../../store/conversation.store";
import type { Artifact as GeneratedArtifact } from "../../lib/conversation";
import { toast } from "sonner";

export default function ChatPage() {
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [artifactWidth, setArtifactWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const setUser = useUserStore((s) => s.setUser);
  const setUserLoading = useUserStore((s) => s.setLoading);
  const addConversation = useConversationStore((s) => s.addConversation);
  const updateConversation = useConversationStore((s) => s.updateConversation);
  const selectedConversation = useConversationStore((s) => s.selectedConversation);

  useEffect(() => {
    const loginToastKey = "justLoggedIn";
    const justLoggedIn = localStorage.getItem(loginToastKey) === "true";
    if (justLoggedIn) {
      toast.success("Welcome back!", {
        description: "You're now logged in and ready to use Relay.",
        duration: 3000,
      });
      localStorage.removeItem(loginToastKey);
    }

    const hydrateUser = async () => {
      try {
        setUserLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          setUser(null);
          router.replace("/auth");
          return;
        }
        setUser(user);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Failed to load signed-in user:", error);
        // Network error — don't force logout, show chat with cached store
        setIsCheckingAuth(false);
      } finally {
        setUserLoading(false);
      }
    };
    hydrateUser();
  }, [router, setUser, setUserLoading]);

  // restore active conversation from persisted store on reload
  useEffect(() => {
    if (!activeConversation && selectedConversation) {
      setActiveConversation(selectedConversation);
    }
  }, [selectedConversation, activeConversation]);

  // keyboard: Esc closes artifact
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isArtifactOpen) setIsArtifactOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isArtifactOpen]);

  // artifact drag resize (desktop)
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(560, Math.max(320, newWidth));
      setArtifactWidth(clamped);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">R</span>
          <div className="flex items-center gap-1.5" aria-label="Checking session">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
          </div>
        </motion.div>
      </main>
    );
  }

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsArtifactOpen(false);
    setIsMobileSidebarOpen(false);
  };

  const handleConversationCreated = (conversation: Conversation) => {
    addConversation(conversation);
    setActiveConversation(conversation);
  };

  const handleConversationUpdated = (conversation: Conversation) => {
    updateConversation(conversation);
    setActiveConversation(conversation);
  };

  return (
    <main className="relative flex h-dvh min-h-[620px] overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar — 240-260 collapsed 64 with motion 150-200ms */}
      <div className="hidden shrink-0 md:flex">
        <Sidebar
          activeConversationId={activeConversation?._id}
          onConversationSelect={handleConversationSelect}
          onClose={() => setSidebarCollapsed(true)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* ChatArea — dominant, flexible */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatArea
          conversationId={activeConversation?._id}
          conversationTitle={activeConversation?.title}
          onConversationCreated={handleConversationCreated}
          onConversationUpdated={handleConversationUpdated}
          isDesktopSidebarOpen={!sidebarCollapsed}
          onArtifactOpen={() => setIsArtifactOpen(true)}
          onArtifactsChange={setArtifacts}
          onSidebarOpen={() => setIsMobileSidebarOpen(true)}
          artifactCount={artifacts.length}
        />
      </section>

      {/* Artifact Panel — 360-440, resizable/collapsible, 200-250ms, chat shrinks smoothly */}
      <AnimatePresence>
        {isArtifactOpen && (
          <motion.aside
            key="artifact-desktop"
            initial={shouldReduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
            animate={{ width: artifactWidth, opacity: 1 }}
            exit={shouldReduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: isResizing ? 0 : shouldReduce ? 0.12 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="hidden h-full shrink-0 overflow-hidden lg:flex relative"
          >
            {/* Drag handle */}
            <div
              onMouseDown={() => setIsResizing(true)}
              className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-foreground/10 active:bg-foreground/15"
              title="Drag to resize"
            >
              <div className="pointer-events-none absolute left-0 top-1/2 h-8 w-px -translate-y-1/2 bg-border" />
            </div>
            <div className="h-full w-full pl-1.5">
              <Artifact isOpen={isArtifactOpen} artifacts={artifacts} onClose={() => setIsArtifactOpen(false)} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div key="mobile-sidebar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setIsMobileSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={{ duration: shouldReduce ? 0.12 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-[min(86vw,300px)] shadow-[12px_0_40px_rgba(0,0,0,0.18)]"
            >
              <Sidebar activeConversationId={activeConversation?._id} onConversationSelect={handleConversationSelect} onClose={() => setIsMobileSidebarOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile/Tablet Artifact — overlay sheet / bottom sheet */}
      <AnimatePresence>
        {isArtifactOpen && (
          <motion.div key="artifact-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close artifact" onClick={() => setIsArtifactOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
            <motion.div
              initial={shouldReduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={shouldReduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
              transition={{ duration: shouldReduce ? 0.12 : 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 bottom-0 top-[8vh] flex overflow-hidden rounded-t-xl border-t bg-background shadow-2xl dark:bg-sidebar sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-[min(100vw,420px)] sm:rounded-none sm:border-l sm:border-t-0"
            >
              <Artifact isOpen={isArtifactOpen} artifacts={artifacts} onClose={() => setIsArtifactOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
