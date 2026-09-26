"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createConversation as createConversationApi, getConversations, deleteConversation as deleteConversationApi } from "../../lib/conversation";
import { getErrorMessage } from "../../lib/errors";
import { useUserStore } from "../../store/user.store";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { logout, deleteAccount } from "../../lib/auth";
import { toast } from "sonner";
import { Conversation, useConversationStore } from "../../store/conversation.store";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import BillingDrawer from "../BillingDrawer";

const ease = [0.16, 1, 0.3, 1] as const;

// Google profile photos 403 without a no-referrer policy, and stored
// avatar URLs can go stale — always fall back to the name initial.
function UserAvatar({ name, avatar }: { name?: string; avatar?: string }) {
  const fbPhoto = auth.currentUser?.photoURL ?? "";
  const src = avatar || fbPhoto || "";
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-medium ring-1 ring-border">
        {name?.charAt(0).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
    />
  );
}

interface SidebarProps {
  activeConversationId?: string;
  onConversationSelect?: (conversation: Conversation) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const formatGroup = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
};

export default function Sidebar({ activeConversationId, onConversationSelect, onClose, collapsed: controlledCollapsed, onCollapsedChange }: SidebarProps) {
  const shouldReduce = useReducedMotion();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (v: boolean) => {
    if (onCollapsedChange) onCollapsedChange(v);
    else setInternalCollapsed(v);
  };

  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const conversations = useConversationStore((s) => s.conversations);
  const selectedConversation = useConversationStore((s) => s.selectedConversation);
  const setSelectedConversation = useConversationStore((s) => s.setSelectedConversation);
  const setConversations = useConversationStore((s) => s.setConversations);
  const addConversation = useConversationStore((s) => s.addConversation);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const isLoading = useConversationStore((s) => s.isLoading);
  const setLoading = useConversationStore((s) => s.setLoading);

  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("relay-theme");
    const dark = saved !== "light";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
    window.localStorage.setItem("relay-theme", next ? "dark" : "light");
    setIsDark(next);
  };

  useEffect(() => {
    // If we have cached conversations, don't show loading spinner on reload
    const hasCached = conversations.length > 0;
    if (!user?.userId) {
      if (!hasCached) setLoading(false);
      return;
    }
    const load = async () => {
      try {
        if (!hasCached) setLoading(true);
        setLoadError("");
        const data = await getConversations();
        setConversations(data);
      } catch (e) {
        console.error("Failed to load conversations:", e);
        if (!hasCached) setLoadError(getErrorMessage(e, "Couldn't load conversations."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.userId, setConversations, setLoading]);

  // Escape closes the open menu.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title?.toLowerCase().includes(q));
  }, [conversations, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Conversation[]>();
    const order: string[] = [];
    for (const c of filtered) {
      const g = formatGroup(c.updatedAt);
      if (!groups.has(g)) {
        groups.set(g, []);
        order.push(g);
      }
      groups.get(g)!.push(c);
    }
    // keep order as encountered (already sorted by updatedAt desc from API), but ensure Today first if present
    return order.map((k) => [k, groups.get(k)!] as const);
  }, [filtered]);

  const handleCreateConversation = async () => {
    if (isCreating) return;
    try {
      setIsCreating(true);
      setCreateError("");
      const conversation = await createConversationApi();
      addConversation(conversation);
      setSelectedConversation(conversation);
      onConversationSelect?.(conversation);
    } catch (e) {
      console.error("Failed to create conversation:", e);
      setCreateError(getErrorMessage(e, "Couldn't create a conversation. Try again."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      setIsDeleting(true);
      setDeleteError("");
      await deleteConversationApi(conversationId);
      removeConversation(conversationId);
      if (selectedConversation?._id === conversationId) setSelectedConversation(null);
      setDeleteId(null);
    } catch (e) {
      console.error("Failed to delete:", e);
      setDeleteError(getErrorMessage(e, "Couldn't delete the conversation. Try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      const [serverLogout, firebaseLogout] = await Promise.allSettled([logout(), signOut(auth)]);
      if (serverLogout.status === "rejected") console.error("Server logout failed:", serverLogout.reason);
      if (firebaseLogout.status === "rejected") console.error("Firebase logout failed:", firebaseLogout.reason);
    } catch (e) {
      console.error("Failed to log out:", e);
    } finally {
      clearUser();
      setIsLoggingOut(false);
      window.location.replace("/auth");
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    onConversationSelect?.(conversation);
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    try {
      setIsDeletingAccount(true);
      await deleteAccount();
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Firebase sign out failed:", e);
      }
      clearUser();
      setConversations([]);
      setSelectedConversation(null);
      setMenuOpen(false);
      toast.success("Account deleted", {
        description: "Your Relay account and data were removed.",
      });
      window.location.replace("/auth");
    } catch (e) {
      console.error("Failed to delete account:", e);
      toast.error("Couldn't delete account", {
        description: getErrorMessage(e, "Try again. If it persists, sign out and back in."),
      });
    } finally {
      setIsDeletingAccount(false);
      setConfirmDeleteAccount(false);
    }
  };

  return (
    <>
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: shouldReduce ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5 pl-1">
            <span className="text-[14px] font-semibold tracking-tight">Relay</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:block">Workspace</span>
          </Link>
        ) : (
          <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">R</span>
        )}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Collapse sidebar"
              title="Collapse"
              className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06] lg:flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 18 9 12l6-6" /><path d="M9 6H5v12h4" /></svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}</svg>
          </button>
        </div>
      </div>

      {!collapsed ? (
        <>
          {/* New Chat */}
          <div className="px-3 pt-3">
            <motion.button
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleCreateConversation}
              disabled={isCreating}
              className="flex h-9 w-full items-center justify-between rounded-md border bg-card px-3 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-60 dark:bg-[#111113] dark:border-[#27272A] dark:hover:bg-[#1A1A1E]"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  {isCreating ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                  )}
                </span>
                {isCreating ? "Creating…" : "New chat"}
              </span>
            </motion.button>
            {createError && <p className="mt-2 rounded-md border border-destructive/15 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">{createError}</p>}
            {loadError && (
              <p className="mt-2 rounded-md border border-destructive/15 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">
                {loadError}{" "}
                <button type="button" onClick={() => setLoadError("")} className="underline underline-offset-2">Dismiss</button>
              </p>
            )}
            {deleteError && (
              <p className="mt-2 rounded-md border border-destructive/15 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">
                {deleteError}{" "}
                <button type="button" onClick={() => setDeleteError("")} className="underline underline-offset-2">Dismiss</button>
              </p>
            )}
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className={`flex h-8 items-center gap-2 rounded-md border bg-white px-2.5 transition-colors dark:bg-[#111113] ${search ? "border-ring" : "border-border"}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-muted-foreground"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-muted-foreground outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear search">×</button>
              )}
            </div>
          </div>

          {/* Chats */}
          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-2">
              <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground">Chats</p>
              {conversations.length > 0 && <span className="font-mono text-[11px] text-muted-foreground">{filtered.length}</span>}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
              {isLoading ? (
                <div className="space-y-2 px-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.06]" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="mx-1 mt-6 rounded-lg border border-dashed bg-white px-4 py-6 text-center dark:bg-[#111113]">
                  <p className="text-[13px] font-medium">{search ? "No chats found" : "Nothing here yet"}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{search ? "Try a different search." : "Start your first conversation."}</p>
                  {!search && (
                    <button type="button" onClick={handleCreateConversation} className="mt-3 text-xs font-medium hover:underline">
                      Start a new chat →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {grouped.map(([group, items]) => (
                    <div key={group}>
                      <p className="px-2 py-1 font-mono text-[11px] text-muted-foreground">{group}</p>
                      <div className="space-y-0.5">
                        {items.map((conversation) => {
                          const isActive = conversation._id === selectedConversation?._id || (!selectedConversation && conversation._id === activeConversationId);
                          const isConfirming = deleteId === conversation._id;
                          return (
                            <div
                              key={conversation._id}
                              className={`group relative flex min-h-[36px] items-center rounded-md border transition-colors ${isActive ? "border-transparent bg-black/[0.06] dark:bg-white/[0.08]" : "border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"}`}
                            >
                              {isActive && <span className="absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 rounded-full bg-accent-foreground/70" aria-hidden="true" />}
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleConversationSelect(conversation)}
                                className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-[13px] leading-5 tracking-[-0.01em]"
                              >
                                <span className={`truncate ${isActive ? "font-medium text-foreground" : "text-foreground/90"}`}>{conversation.title || "New conversation"}</span>
                              </button>
                              {isConfirming ? (
                                <div className="absolute inset-y-1 right-1 flex items-center gap-1 rounded-md bg-card px-1 shadow-sm">
                                  <button type="button" disabled={isDeleting} onClick={() => handleDeleteConversation(conversation._id)} className="rounded px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10">
                                    {isDeleting ? "…" : "Delete"}
                                  </button>
                                  <button type="button" onClick={() => setDeleteId(null)} className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(conversation._id);
                                  }}
                                  aria-label="Delete"
                                  className="mr-1 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.06] hover:text-destructive group-hover:flex dark:hover:bg-white/[0.08]"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer — billing + theme toggle + user */}
          <div className="border-t border-sidebar-border p-2 space-y-1">
            <button
              type="button"
              onClick={() => setBillingOpen(true)}
              className="flex w-full items-center justify-between rounded-md border bg-card px-2.5 py-2 text-left shadow-sm transition-colors hover:bg-secondary dark:bg-[#111113] dark:border-[#27272A] dark:hover:bg-[#1A1A1E]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
                  {(user?.credits ?? 0) >= 1000 ? `${Math.floor((user?.credits ?? 0) / 1000)}k` : `${user?.credits ?? 0}`}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium leading-none capitalize">{user?.plan ?? "free"} plan</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">{(user?.credits ?? 0).toLocaleString()} credits</span>
                </span>
              </span>
              <span className="shrink-0 rounded border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Upgrade</span>
            </button>
            <div className="flex items-center justify-between rounded-md px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                </span>
                <div>
                  <p className="text-xs font-medium leading-none">Theme</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{isDark ? "Dark" : "Light"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
                className="flex h-7 w-11 items-center rounded-full border bg-secondary p-0.5 transition-colors"
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-card shadow-sm transition-transform ${isDark ? "translate-x-4 bg-foreground text-background" : "translate-x-0 bg-white text-foreground"}`}>
                  {isDark ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" /></svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                  )}
                </span>
              </button>
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <UserAvatar name={user?.name} avatar={user?.avatar} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-medium leading-none">{user?.name || "Guest"}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{user?.email || "Sign in to sync"}</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-muted-foreground"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease }}
                    className="absolute bottom-[44px] left-0 right-0 z-10 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
                  >
                    <button onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50">
                      {isLoggingOut ? <span className="h-3 w-3 animate-spin rounded-full border border-destructive/30 border-t-destructive" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>}
                      {isLoggingOut ? "Signing out…" : "Sign out"}
                    </button>
                    <div className="my-1 h-px bg-border" />
                    {confirmDeleteAccount ? (
                      <div className="rounded-md bg-destructive/5 p-2">
                        <p className="px-1 text-[11px] font-medium text-destructive">Delete account permanently?</p>
                        <div className="mt-1.5 flex gap-1">
                          <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                            className="flex-1 rounded-md bg-destructive px-2 py-1.5 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {isDeletingAccount ? "Deleting…" : "Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAccount(false)}
                            disabled={isDeletingAccount}
                            className="flex-1 rounded-md border px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAccount(true)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                        Delete account
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      ) : (
        /* Collapsed */
        <div className="flex flex-1 flex-col items-center gap-2 px-2 py-3">
          <button type="button" onClick={handleCreateConversation} className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground" title="New chat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          </button>
          <button type="button" onClick={() => setCollapsed(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]" title="Expand sidebar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            title={`Switch to ${isDark ? "light" : "dark"} theme`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
          >
            {isDark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" /></svg>
            )}
          </button>
          <div className="my-1 h-px w-6 bg-border" />
          <div className="flex flex-1 flex-col gap-1 overflow-hidden">
            {filtered.slice(0, 8).map((c) => {
              const isActive = c._id === selectedConversation?._id || c._id === activeConversationId;
              return (
                <button key={c._id} type="button" onClick={() => handleConversationSelect(c)} title={c.title || "New conversation"} className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium ${isActive ? "bg-black/[0.06] dark:bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}>
                  {(c.title || "?").charAt(0).toUpperCase()}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setBillingOpen(true)}
            title="Billing & credits"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </button>
          <div className="mt-auto">
            <UserAvatar name={user?.name} avatar={user?.avatar} />
          </div>
        </div>
      )}
    </motion.aside>
    <BillingDrawer open={billingOpen} onClose={() => setBillingOpen(false)} />
    </>
  );
}
