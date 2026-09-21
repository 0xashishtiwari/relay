"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Artifact from "../../components/chat/Artifact";
import ChatArea from "../../components/chat/chatArea";
import Sidebar from "../../components/chat/sidebar";
import { getCurrentUser } from "../../lib/auth";
import { useUserStore } from "../../store/user.store";
import {
  Conversation,
  useConversationStore,
} from "../../store/conversation.store";

const ChatPage = () => {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);

  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const setUser = useUserStore((state) => state.setUser);
  const setUserLoading = useUserStore((state) => state.setLoading);
  const addConversation = useConversationStore(
    (state) => state.addConversation
  );
  const updateConversation = useConversationStore(
    (state) => state.updateConversation
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateUser = async () => {
      try {
        const user = await getCurrentUser();

        if (!cancelled) {
          setUser(user);

          if (!user) {
            router.replace("/auth");
            return;
          }

          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error("Failed to load signed-in user:", error);

        if (!cancelled) {
          setUser(null);
          router.replace("/auth");
        }
      } finally {
        if (!cancelled) {
          setUserLoading(false);
        }
      }
    };

    hydrateUser();

    return () => {
      cancelled = true;
    };
  }, [router, setUser, setUserLoading]);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            R
          </div>
          <div className="flex items-center gap-1.5" aria-label="Checking session">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
          </div>
        </div>
      </main>
    );
  }

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
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

  const handleMobileSidebarOpen = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleDesktopSidebarClose = () => {
    setIsDesktopSidebarOpen(false);
  };

  const handleDesktopSidebarOpen = () => {
    setIsDesktopSidebarOpen(true);
  };

  return (
    <main className="relative flex h-dvh min-h-[620px] overflow-hidden bg-background text-foreground">
      {/* ------------------------------------------------ */}
      {/* Desktop Sidebar */}
      {/* ------------------------------------------------ */}

      {isDesktopSidebarOpen && (
        <aside className="relay-slide-in hidden h-full shrink-0 md:flex">
          <Sidebar
            activeConversationId={activeConversation?._id}
            onConversationSelect={handleConversationSelect}
            onClose={handleDesktopSidebarClose}
          />
        </aside>
      )}

      {/* ------------------------------------------------ */}
      {/* Main Content */}
      {/* ------------------------------------------------ */}

      <section className="relative flex min-w-0 flex-1">
        {/* Re-open sidebar button */}
        {!isDesktopSidebarOpen && (
          <button
            type="button"
            onClick={handleDesktopSidebarOpen}
            aria-label="Open sidebar"
            title="Open sidebar"
            className="absolute left-4 top-4 z-30 hidden h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111412]/90 text-zinc-500 shadow-lg backdrop-blur transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:flex"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
        )}

        <ChatArea
          conversationId={activeConversation?._id}
          conversationTitle={activeConversation?.title}
          onConversationCreated={handleConversationCreated}
          onConversationUpdated={handleConversationUpdated}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          onArtifactOpen={() => setIsArtifactOpen(true)}
          onSidebarOpen={handleMobileSidebarOpen}
        />
      </section>

      {/* ------------------------------------------------ */}
      {/* Artifact */}
      {/* ------------------------------------------------ */}

      {isArtifactOpen && (
        <aside className="relay-slide-in-right hidden h-full shrink-0 lg:flex">
          <Artifact
            isOpen={isArtifactOpen}
            onClose={() => setIsArtifactOpen(false)}
          />
        </aside>
      )}

      {/* ------------------------------------------------ */}
      {/* Mobile Sidebar Overlay */}
      {/* ------------------------------------------------ */}

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={handleMobileSidebarClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Sidebar */}
          <div className="relative h-full w-[min(86vw,300px)] shadow-[20px_0_60px_rgba(0,0,0,0.45)]">
            <Sidebar
              activeConversationId={activeConversation?._id}
              onConversationSelect={handleConversationSelect}
              onClose={handleMobileSidebarClose}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* Mobile Artifact */}
      {/* ------------------------------------------------ */}

      {isArtifactOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <Artifact
            isOpen={isArtifactOpen}
            onClose={() => setIsArtifactOpen(false)}
          />
        </div>
      )}
    </main>
  );
};

export default ChatPage;