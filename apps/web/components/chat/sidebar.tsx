"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../lib/axios";
import {
  createConversation as createConversationApi,
  getConversations,
} from "../../lib/conversation";
import { useUserStore } from "../../store/user.store";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { logout } from "../../lib/auth";
import ThemeToggle from "../theme-toggle";
import {
  Conversation,
  useConversationStore,
} from "../../store/conversation.store";
import Link from "next/link";

interface SidebarProps {
  activeConversationId?: string;
  onConversationSelect?: (conversation: Conversation) => void;
  onClose?: () => void;
}

const formatDate = (date: string) => {
  const value = new Date(date);
  const today = new Date();

  if (value.toDateString() === today.toDateString()) {
    return value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (value.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return value.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const Sidebar = ({
  activeConversationId,
  onConversationSelect,
  onClose,
}: SidebarProps) => {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);

  const conversations = useConversationStore(
    (state) => state.conversations
  );

  const selectedConversation = useConversationStore(
    (state) => state.selectedConversation
  );

  const setSelectedConversation = useConversationStore(
    (state) => state.setSelectedConversation
  );

  const setConversations = useConversationStore(
    (state) => state.setConversations
  );

  const addConversation = useConversationStore(
    (state) => state.addConversation
  );

  const removeConversation = useConversationStore(
    (state) => state.removeConversation
  );

  const isLoading = useConversationStore(
    (state) => state.isLoading
  );

  const setLoading = useConversationStore(
    (state) => state.setLoading
  );

  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /* -------------------------------------------------------
     LOAD CONVERSATIONS
  ------------------------------------------------------- */

  useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    const loadConversations = async () => {
      try {
        setLoading(true);

        const data = await getConversations();

        setConversations(data);
      } catch (error) {
        console.error(
          "Failed to load conversations:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user?.userId, setConversations, setLoading]);

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.title
        ?.toLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  /* -------------------------------------------------------
     CREATE
  ------------------------------------------------------- */

  const handleCreateConversation = async () => {
    if (isCreating) return;

    try {
      setIsCreating(true);
      setCreateError("");

      const conversation =
        await createConversationApi();

      addConversation(conversation);
      setSelectedConversation(conversation);

      onConversationSelect?.(conversation);
    } catch (error) {
      console.error(
        "Failed to create conversation:",
        error
      );

      setCreateError(
        "Couldn't create a conversation. Try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  /* -------------------------------------------------------
     DELETE
  ------------------------------------------------------- */

  const handleDeleteConversation = async (
    conversationId: string
  ) => {
    try {
      setIsDeleting(true);

      await api.delete("/chat/conversation", {
        data: { conversationId },
      });

      removeConversation(conversationId);

      if (
        selectedConversation?._id ===
        conversationId
      ) {
        setSelectedConversation(null);
      }

      setDeleteId(null);
    } catch (error) {
      console.error(
        "Failed to delete conversation:",
        error
      );
    } finally {
      setIsDeleting(false);
    }
  };

  /* -------------------------------------------------------
     LOGOUT
  ------------------------------------------------------- */

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      const [
        serverLogout,
        firebaseLogout,
      ] = await Promise.allSettled([
        logout(),
        signOut(auth),
      ]);

      if (serverLogout.status === "rejected") {
        console.error(
          "Server logout failed:",
          serverLogout.reason
        );
      }

      if (firebaseLogout.status === "rejected") {
        console.error(
          "Firebase logout failed:",
          firebaseLogout.reason
        );
      }
    } catch (error) {
      console.error(
        "Failed to log out:",
        error
      );
    } finally {
      clearUser();
      setIsLoggingOut(false);
      window.location.replace("/auth");
    }
  };

  /* -------------------------------------------------------
     SELECT
  ------------------------------------------------------- */

  const handleConversationSelect = (
    conversation: Conversation
  ) => {
    setSelectedConversation(conversation);
    onConversationSelect?.(conversation);
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <aside
      className="
        flex h-full w-full max-w-[320px]
        flex-col
        border-r border-sidebar-border
        bg-sidebar
        text-sidebar-foreground
      "
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="shrink-0 px-4 pt-5">
        <div className="flex items-center justify-between">

          {/* Brand */}

          <div className="flex items-center gap-3">
            <div
              className="
                flex h-10 w-10
                items-center justify-center
                rounded-xl
                bg-primary
                text-sm font-bold
                text-primary-foreground
              "
            >
              R
            </div>

            <div>
              <Link href="/" className="text-[16px] font-semibold tracking-[-0.025em] text-sidebar-foreground">
              <p
                className="
                  text-[16px]
                  font-semibold
                  tracking-[-0.025em]
                  text-sidebar-foreground
                "
              >
                Relay
              </p>
              </Link>
              <p className="mt-1 text-[11px] tracking-wide text-muted-foreground">
                AI workspace
              </p>
            </div>
          </div>

          {/* Close */}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
            className="
              flex h-9 w-9
              items-center justify-center
              rounded-xl
              text-muted-foreground
              transition-colors
              hover:bg-secondary
              hover:text-foreground
            "
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* =================================================
            NEW CHAT
        ================================================== */}

        <button
          type="button"
          onClick={handleCreateConversation}
          disabled={isCreating}
          className="
            mt-6
            flex h-12 w-full
            items-center justify-between
            rounded-xl
            border border-primary/25
            bg-accent
            px-3.5
            text-[14px]
            font-medium
            text-accent-foreground
            transition-colors
            hover:border-primary/40
            hover:bg-accent/80
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <span className="flex items-center gap-3">
            <span
              className="
                flex h-7 w-7
                items-center justify-center
                rounded-lg
                bg-primary
                text-primary-foreground
              "
            >
              {isCreating ? (
                <span
                  className="
                    h-3 w-3
                    animate-spin
                    rounded-full
                    border
                    border-primary-foreground/30
                    border-t-primary-foreground
                  "
                />
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              )}
            </span>

            {isCreating
              ? "Creating..."
              : "New chat"}
          </span>

          {!isCreating && (
            <span
              className="
                hidden
                rounded-md
                border border-border
                bg-background
                px-2 py-1
                text-[10px]
                font-medium
                text-muted-foreground
                sm:inline-block
              "
            >
              N
            </span>
          )}
        </button>

        {createError && (
          <div
            className="
              mt-3
              rounded-lg
              border border-destructive/20
              bg-destructive/5
              px-3 py-2.5
            "
          >
            <p className="text-[11px] leading-5 text-destructive">
              {createError}
            </p>
          </div>
        )}
      </header>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div className="px-4 pb-4 pt-6">
        <div
          className={`
            flex h-11
            items-center gap-3
            rounded-xl
            border
            bg-background
            px-3
            transition-colors
            ${
              search
                ? "border-ring"
                : "border-border"
            }
          `}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="shrink-0 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search chats..."
            className="
              min-w-0 flex-1
              bg-transparent
              text-[13px]
              text-foreground
              outline-none
              placeholder:text-muted-foreground
            "
          />

          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="
                flex h-6 w-6
                items-center justify-center
                rounded-md
                text-muted-foreground
                hover:bg-secondary
                hover:text-foreground
              "
              aria-label="Clear search"
            >
              ×
            </button>
          ) : (
            <span
              className="
                hidden
                rounded
                border border-border
                px-1.5 py-0.5
                text-[9px]
                text-muted-foreground
                sm:block
              "
            >
              /
            </span>
          )}
        </div>
      </div>

      {/* =====================================================
          CONVERSATIONS
      ====================================================== */}

      <div
        className="
          min-h-0 flex-1
          overflow-y-auto
          px-3 pb-4
          [scrollbar-width:thin]
          [scrollbar-color:var(--border)_transparent]
        "
      >
        <div className="mb-3 flex items-center justify-between px-2">
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-muted-foreground
            "
          >
            Conversations
          </p>

          {conversations.length > 0 && (
            <span
              className="
                rounded-full
                bg-secondary
                px-2 py-0.5
                text-[10px]
                text-muted-foreground
              "
            >
              {conversations.length}
            </span>
          )}
        </div>

        {/* Loading */}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="
                  h-[72px]
                  animate-pulse
                  rounded-xl
                  bg-secondary
                "
              >
                <div className="px-4 py-4">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="mt-3 h-2.5 w-1/4 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (

          /* Empty */

          <div
            className="
              mx-1 mt-10
              rounded-2xl
              border border-dashed border-border
              bg-secondary/40
              px-5 py-8
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex h-11 w-11
                items-center justify-center
                rounded-xl
                bg-secondary
                text-muted-foreground
              "
            >
              {search ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.8-.9L3 21l1.9-4.8A8.4 8.4 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.5 8.5 8.5 0 0 1 9 8.5Z" />
                </svg>
              )}
            </div>

            <p className="mt-4 text-[13px] font-medium text-foreground">
              {search
                ? "No conversations found"
                : "Nothing here yet"}
            </p>

            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              {search
                ? "Try a different search."
                : "Start your first conversation with Relay."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={handleCreateConversation}
                className="
                  mt-5
                  text-[12px]
                  font-medium
                  text-primary
                  transition-opacity
                  hover:opacity-70
                "
              >
                Start a new chat →
              </button>
            )}
          </div>

        ) : (

          /* Conversation list */

          <div className="space-y-1">
            {filteredConversations.map(
              (conversation) => {
                const isActive =
                  conversation._id ===
                    selectedConversation?._id ||
                  (!selectedConversation &&
                    conversation._id ===
                      activeConversationId);

                const isConfirmingDelete =
                  deleteId === conversation._id;

                return (
                  <div
                    key={conversation._id}
                    className={`
                      group
                      relative
                      flex
                      min-h-[72px]
                      rounded-xl
                      border
                      transition-colors
                      ${
                        isActive
                          ? "border-primary/20 bg-accent"
                          : "border-transparent hover:border-border hover:bg-secondary"
                      }
                    `}
                  >
                    {/* Active indicator */}

                    {isActive && (
                      <span
                        className="
                          absolute
                          left-0
                          top-1/2
                          h-8
                          w-[2px]
                          -translate-y-1/2
                          rounded-r-full
                          bg-primary
                        "
                      />
                    )}

                    {/* Conversation */}

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() =>
                        handleConversationSelect(
                          conversation
                        )
                      }
                      className="min-w-0 flex-1 px-4 py-3.5 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`
                            mt-2
                            h-2 w-2
                            shrink-0
                            rounded-full
                            ${
                              isActive
                                ? "bg-primary"
                                : "bg-muted-foreground/30"
                            }
                          `}
                        />

                        <div className="min-w-0 flex-1">
                          <p
                            className={`
                              truncate
                              text-[14px]
                              leading-5
                              tracking-[-0.01em]
                              ${
                                isActive
                                  ? "font-medium text-accent-foreground"
                                  : "text-foreground"
                              }
                            `}
                          >
                            {conversation.title ||
                              "New conversation"}
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(
                                conversation.updatedAt
                              )}
                            </span>

                            {isActive && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-border" />

                                <span className="text-[10px] text-primary">
                                  Active
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Delete */}

                    {isConfirmingDelete ? (
                      <div
                        className="
                          absolute
                          inset-y-0
                          right-1
                          flex
                          items-center
                          gap-1
                          rounded-r-xl
                          bg-card
                          px-2
                        "
                      >
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() =>
                            handleDeleteConversation(
                              conversation._id
                            )
                          }
                          className="
                            rounded-lg
                            px-2.5 py-1.5
                            text-[10px]
                            font-medium
                            text-destructive
                            transition-colors
                            hover:bg-destructive/10
                          "
                        >
                          {isDeleting
                            ? "Deleting..."
                            : "Delete"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteId(null)
                          }
                          className="
                            rounded-lg
                            px-2.5 py-1.5
                            text-[10px]
                            text-muted-foreground
                            transition-colors
                            hover:bg-secondary
                            hover:text-foreground
                          "
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteId(
                            conversation._id
                          );
                        }}
                        aria-label={`Delete ${
                          conversation.title ||
                          "conversation"
                        }`}
                        title="Delete conversation"
                        className="
                          mr-2
                          hidden
                          h-8 w-8
                          self-center
                          items-center justify-center
                          rounded-lg
                          text-muted-foreground
                          transition-colors
                          hover:bg-destructive/10
                          hover:text-destructive
                          group-hover:flex
                        "
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 15H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          USER FOOTER
      ====================================================== */}

      <footer className="shrink-0 border-t border-sidebar-border p-3">
        <ThemeToggle />

        <button
          type="button"
          className="
            group
            flex w-full
            items-center gap-3
            rounded-xl
            px-3 py-2.5
            transition-colors
            hover:bg-secondary
          "
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="
                h-9 w-9
                shrink-0
                rounded-full
                object-cover
                ring-1 ring-border
              "
            />
          ) : (
            <span
              className="
                flex h-9 w-9
                shrink-0
                items-center justify-center
                rounded-full
                bg-secondary
                text-[13px]
                font-medium
                text-foreground
                ring-1 ring-border
              "
            >
              {user?.name?.charAt(0).toUpperCase() ||
                "?"}
            </span>
          )}

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-medium text-foreground">
              {user?.name || "Guest"}
            </p>

            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {user?.email || "Sign in to sync"}
            </p>
          </div>

          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="
              text-muted-foreground
              transition-colors
              group-hover:text-foreground
            "
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="
            mt-1
            flex w-full
            items-center gap-2.5
            rounded-xl
            px-3 py-2.5
            text-left
            text-[11px]
            text-muted-foreground
            transition-colors
            hover:bg-destructive/10
            hover:text-destructive
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {isLoggingOut ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground" />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
            </svg>
          )}

          {isLoggingOut
            ? "Signing out..."
            : "Sign out"}
        </button>
      </footer>
    </aside>
  );
};

export default Sidebar;
