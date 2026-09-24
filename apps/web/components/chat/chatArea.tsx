"use client";

import { FormEvent, KeyboardEvent, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  createConversation as createConversationApi,
  getMessages,
  sendMessage as sendAgentMessage,
  updateConversation as updateConversationApi,
} from "../../lib/conversation";
import type { AgentName } from "../../lib/conversation";
import type { Artifact as ConversationArtifact } from "../../lib/conversation";
import type { Conversation } from "../../store/conversation.store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ease = [0.16, 1, 0.3, 1] as const;

interface ChatAreaProps {
  conversationId?: string;
  conversationTitle?: string;
  onConversationCreated?: (conversation: Conversation) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  isDesktopSidebarOpen?: boolean;
  onArtifactOpen?: () => void;
  onArtifactsChange?: (artifacts: Artifact[]) => void;
  onSidebarOpen?: () => void;
  artifactCount?: number;
}

interface ArtifactFile {
  name: string;
  content: string;
}
interface Artifact {
  id: string;
  title?: string;
  type: string;
  files: ArtifactFile[];
}
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  artifacts?: Artifact[];
}

const SearchImage = ({ src, index }: { src: string; index: number }) => {
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen]);
  if (hasError) return null;
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} aria-label={`Open image ${index + 1}`} className="block w-full overflow-hidden rounded-lg border bg-card hover:opacity-90">
        <img src={src} alt={`Generated image ${index + 1}`} loading="lazy" onError={() => setHasError(true)} className="aspect-video w-full object-cover" />
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" onClick={() => setIsOpen(false)} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 sm:p-8">
          <div onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] max-w-[min(92vw,1100px)] rounded-xl border bg-card p-2 shadow-2xl">
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close image" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">×</button>
            <img src={src} alt={`Generated image ${index + 1}`} className="max-h-[calc(92vh-16px)] max-w-full rounded-lg object-contain" />
          </div>
        </div>, document.body)}
    </>
  );
};

const extractGeneratedImageUrls = (content: string) => {
  return Array.from(content.matchAll(/https?:\/\/[^\s]+/g))
    .map(([url]) => url.replace(/[),.;]+$/, ""))
    .filter((url) => url.includes("generated-images/") || /\.(png|jpe?g|gif|webp)(?:\?|$)/i.test(url));
};

const InlineCode = ({ className, children }: { className?: string; children?: ReactNode }) => <code className={className}>{children}</code>;

const CodePre = ({ children }: { children?: ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const codeElement = children as ReactElement<{ children?: ReactNode; className?: string }> | null;
  const rawCode = codeElement?.props?.children;
  const code = String(rawCode ?? "").replace(/\n$/, "");
  const language = codeElement?.props?.className?.match(/language-(\w+)/)?.[1] ?? "code";
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="my-4 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground">{language}</span>
        <button type="button" onClick={copyCode} className="rounded-md border bg-card px-2 py-1 text-[11px] hover:bg-secondary">{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6"><code>{code}</code></pre>
    </div>
  );
};

const ArtifactCard = ({ artifact, onOpen }: { artifact: Artifact; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="flex w-full items-center justify-between rounded-lg border bg-card px-3.5 py-3 text-left hover:bg-secondary/40 transition-colors"
  >
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-secondary font-mono text-[11px]">◈</span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">Generated project</p>
        <p className="font-mono text-[11px] text-muted-foreground">{artifact.files.length} {artifact.files.length === 1 ? "file" : "files"}</p>
      </div>
    </div>
    <span className="ml-3 shrink-0 text-xs text-muted-foreground">Open →</span>
  </button>
);

const AgentActivity = ({ isGenerating, agent }: { isGenerating: boolean; agent: AgentName }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      setStep(0);
      return;
    }
    setStep(1);
    const timers = [
      window.setTimeout(() => setStep(2), 900),
      window.setTimeout(() => setStep(3), 1800),
      window.setTimeout(() => setStep(4), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  if (!isGenerating) return null;

  const agentLabel = agent !== "auto" ? `${agent} agent` : null;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="rounded-lg border bg-card px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
        <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{agentLabel ? `${agentLabel} · Working…` : "Relay is working"}</p>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {[
          ["Understanding request", step >= 1],
          ["Searching relevant information", step >= 2],
          ["Generating response", step >= 3],
        ].map(([label, done]) => (
          <div key={label as string} className="flex items-center gap-2 font-mono text-[11px]">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-muted-foreground"}`}>
              {done ? "✓" : "·"}
            </span>
            <span className={done ? "text-foreground" : "text-muted-foreground"}>{label as string}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Search", "Coding", "Presentation"].map((a, i) => (
          <motion.span
            key={a}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.06 }}
            className="rounded-full border bg-secondary px-2 py-0.5 font-mono text-[10px]"
          >
            {a}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

export default function ChatArea({
  conversationId,
  conversationTitle = "New conversation",
  onConversationCreated,
  onConversationUpdated,
  onArtifactOpen,
  onArtifactsChange,
  onSidebarOpen,
  isDesktopSidebarOpen = true,
  artifactCount = 0,
}: ChatAreaProps) {
  const shouldReduce = useReducedMotion();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentName>("auto");
  const [showPlus, setShowPlus] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      if (!conversationId) {
        setMessages([]);
        setArtifacts([]);
        onArtifactsChange?.([]);
        setSendError("");
        return;
      }
      try {
        setIsLoadingMessages(true);
        setSendError("");
        const data = await getMessages(conversationId);
        if (cancelled) return;
        const formatted: Message[] = data
          .filter((item) => item.role !== "system")
          .map((item) => ({
            id: item._id,
            role: item.role as Message["role"],
            content: item.content,
            images: Array.from(new Set([...(item.images ?? []), ...extractGeneratedImageUrls(item.content)])),
            artifacts: item.artifacts ?? [],
          }));
        setMessages(formatted);
        const loaded = formatted.flatMap((m) => m.artifacts ?? []);
        setArtifacts(loaded);
        onArtifactsChange?.(loaded);
        if (loaded.length > 0) onArtifactOpen?.();
      } catch (e) {
        console.error("Failed to load messages:", e);
        if (!cancelled) setSendError("Unable to load this conversation.");
      } finally {
        if (!cancelled) setIsLoadingMessages(false);
      }
    };
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setShowPlus(false);
      if (agentRef.current && !agentRef.current.contains(e.target as Node)) setShowAgentMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openArtifact = (artifact: Artifact) => {
    setArtifacts([artifact]);
    onArtifactOpen?.();
  };

  const sendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const content = message.trim();
    if (!content || isGenerating) return;
    setSendError("");
    setIsGenerating(true);
    let conversationToSync: Conversation | undefined;
    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const created = await createConversationApi();
        activeConversationId = created._id;
        conversationToSync = await updateConversationApi(activeConversationId, content);
      } else if (messages.length === 0) {
        conversationToSync = await updateConversationApi(activeConversationId, content);
      }
      const userMessage: Message = { id: crypto.randomUUID(), role: "user", content };
      setMessages((c) => [...c, userMessage]);
      setMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      const agentResponse = await sendAgentMessage(activeConversationId, content, selectedAgent);
      const responseText = typeof agentResponse?.response === "string" ? agentResponse.response : "";
      const responseImages = Array.from(new Set([...(Array.isArray(agentResponse?.images) ? agentResponse.images : []), ...extractGeneratedImageUrls(responseText)]));
      const responseArtifacts: Artifact[] = Array.isArray(agentResponse?.artifacts) ? agentResponse.artifacts : [];
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseText,
        images: responseImages,
        artifacts: responseArtifacts.length > 0 ? responseArtifacts : undefined,
      };
      setMessages((c) => [...c, assistantMessage]);
      if (responseArtifacts.length > 0) {
        const next = [...artifacts, ...responseArtifacts];
        setArtifacts(next);
        onArtifactsChange?.(next);
        if (selectedAgent === "coding") onArtifactOpen?.();
      }
      if (conversationToSync) {
        if (conversationId) onConversationUpdated?.(conversationToSync);
        else onConversationCreated?.(conversationToSync);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setSendError("Relay couldn't complete that request. Try again.");
    } finally {
      setIsGenerating(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  };

  const showIntro = Boolean(conversationId) && !isLoadingMessages && messages.length === 0;
  const effectiveArtifactCount = artifactCount || artifacts.length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-card text-foreground">
      {/* Header — premium minimal, subtle rose accent on Relay state */}
      <header className={`flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-5 ${!isDesktopSidebarOpen ? "md:pl-14" : ""}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onSidebarOpen}
            aria-label="Open sidebar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[14px] font-medium tracking-tight sm:text-[15px]">{conversationTitle}</h1>
              {conversationId && <span className="hidden rounded-full border bg-secondary px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground sm:inline">Relay</span>}
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${isGenerating ? "animate-pulse bg-accent-foreground" : "bg-emerald-500"}`} />
              <span className="font-mono text-[11px] text-muted-foreground">{isGenerating ? "Working…" : "Ready"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (effectiveArtifactCount > 0) onArtifactOpen?.();
            }}
            disabled={effectiveArtifactCount === 0}
            className="relative hidden h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-40 dark:bg-[#111113]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            Artifacts
            {effectiveArtifactCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">{effectiveArtifactCount}</span>
            )}
            {effectiveArtifactCount === 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-border" />}
          </button>
          <button
            type="button"
            onClick={() => effectiveArtifactCount > 0 && onArtifactOpen?.()}
            disabled={effectiveArtifactCount === 0}
            className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-secondary disabled:opacity-40 sm:hidden dark:bg-[#111113]"
            aria-label="Artifacts"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          </button>
          <button type="button" aria-label="More" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        <div className="mx-auto flex w-full max-w-[760px] flex-col px-4 py-6 sm:px-6 lg:px-8">
          {/* No conversation */}
          {!conversationId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease }}
              className="flex min-h-[56vh] flex-col items-center justify-center text-center"
            >
              <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[24px]">What are we working on?</h2>
              <p className="mt-2 max-w-[42ch] text-[13px] leading-6 text-muted-foreground">Ask Relay to research, code, create, or build something.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {[
                  ["Research", "Research a topic"],
                  ["Code", "Help me write code"],
                  ["Create", "Generate an image"],
                  ["Present", "Make a presentation"],
                ].map(([label, text]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleMessageChange(text as string)}
                    className="rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty conversation intro */}
          {showIntro && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="py-8"
            >
              <div className="mx-auto max-w-[560px] text-center">
                <h2 className="text-[18px] font-medium tracking-tight">What are we working through?</h2>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">Give Relay a task. It will reason, coordinate specialist agents, and turn the result into something useful.</p>
              </div>
              <div className="mx-auto mt-6 grid max-w-[520px] grid-cols-2 gap-2">
                {[
                  { label: "Research a topic", text: "Research a topic for me" },
                  { label: "Build something", text: "Help me design an AI agent" },
                  { label: "Create an image", text: "Generate an image of a minimal workspace" },
                  { label: "Make a presentation", text: "Create a presentation about AI agents" },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => handleMessageChange(s.text)}
                    className="rounded-lg border bg-card px-3.5 py-3 text-left text-xs hover:bg-secondary"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isLoadingMessages && (
            <div className="space-y-6 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-full animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          {!isLoadingMessages && messages.length > 0 && (
            <div className="flex flex-col gap-8">
              {messages.map((item) => {
                const isUser = item.role === "user";
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease }}
                    className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">R</span>
                    )}
                    <div className={`min-w-0 max-w-[86%] sm:max-w-[78%] ${isUser ? "flex flex-col items-end" : ""}`}>
                      <div className={`mb-1.5 flex items-center gap-2 ${isUser ? "justify-end" : ""}`}>
                        <span className="font-mono text-[11px] text-muted-foreground">{isUser ? "You" : "Relay"}</span>
                        {!isUser && <span className="rounded-full border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Agent</span>}
                      </div>

                      <div
                        className={
                          isUser
                            ? "whitespace-pre-wrap break-words rounded-2xl rounded-br-lg bg-primary px-4 py-3 text-[15px] leading-7 text-primary-foreground"
                            : "break-words text-[15px] leading-7 text-foreground"
                        }
                      >
                        {isUser ? (
                          item.content
                        ) : (
                          <div className="relay-markdown">
                            {item.content && (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code: InlineCode as any,
                                  pre: CodePre as any,
                                  table: ({ children }) => <div className="relay-table-wrap"><table>{children}</table></div>,
                                }}
                              >
                                {item.content}
                              </ReactMarkdown>
                            )}
                            {item.images && item.images.length > 0 && (
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {item.images.map((img, idx) => (
                                  <SearchImage key={`${img}-${idx}`} src={img} index={idx} />
                                ))}
                              </div>
                            )}
                            {item.artifacts && item.artifacts.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {item.artifacts.map((artifact) => (
                                  <ArtifactCard key={artifact.id} artifact={artifact} onOpen={() => openArtifact(artifact)} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!isUser && (
                        <div className="mt-1.5 hidden gap-1 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                          {[
                            ["Copy", () => navigator.clipboard.writeText(item.content)],
                            ["Retry", () => {}],
                            ["↑", () => {}],
                          ].map(([label, onClick]) => (
                            <button
                              key={label as string}
                              type="button"
                              onClick={onClick as () => void}
                              className="rounded-md border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              {label as string}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px]">Y</span>}
                  </motion.div>
                );
              })}

              {isGenerating && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">R</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-muted-foreground">Relay</p>
                    <div className="mt-1.5 max-w-[520px]">
                      <AgentActivity isGenerating={isGenerating} agent={selectedAgent} />
                      <div className="mt-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground [animation-delay:300ms]" />
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">Streaming response…</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {sendError && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="shrink-0 px-4 sm:px-6">
            <div className="mx-auto mb-2 flex max-w-[760px] items-center justify-between rounded-lg border border-destructive/15 bg-destructive/5 px-3 py-2.5">
              <p className="text-xs text-destructive">{sendError}</p>
              <button type="button" onClick={() => setSendError("")} className="ml-3 text-xs text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer — 12–16px radius, near bottom center */}
      <div className="shrink-0 bg-gradient-to-t from-card via-card to-transparent px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
        <div className="mx-auto max-w-[760px]">
          <form
            onSubmit={sendMessage}
            className={`rounded-[14px] border bg-card p-2 shadow-sm transition-all dark:bg-[#111113] dark:border-[#27272A] ${
              message.trim() || conversationId ? "border-border focus-within:border-ring focus-within:shadow-md" : "border-border opacity-90"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={conversationId ? "Ask Relay anything…" : "Start a conversation…"}
              disabled={isGenerating}
              rows={1}
              className="max-h-36 min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-[14px] leading-6 text-foreground placeholder:text-muted-foreground caret-foreground outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div ref={plusRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPlus((v) => !v)}
                    disabled={isGenerating}
                    aria-label="Add"
                    className="flex h-8 w-8 items-center justify-center rounded-full border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground disabled:opacity-30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                  </button>
                  <AnimatePresence>
                    {showPlus && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                        className="absolute bottom-9 left-0 z-10 w-48 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
                      >
                        {[
                          ["Upload file", "↗"],
                          ["Add image", "◈"],
                          ["Add context", "◎"],
                        ].map(([label, icon]) => (
                          <button key={label} type="button" onClick={() => setShowPlus(false)} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs hover:bg-secondary">
                            <span>{label}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">{icon}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div ref={agentRef} className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setShowAgentMenu((v) => !v)}
                    disabled={isGenerating}
                    className="flex h-8 items-center gap-1.5 rounded-full border bg-secondary px-3 text-xs font-medium hover:bg-secondary/80 disabled:opacity-30"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                    {selectedAgent === "auto" ? "Auto" : selectedAgent}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  <AnimatePresence>
                    {showAgentMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.14 }}
                        className="absolute bottom-9 left-0 z-10 w-48 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
                      >
                        {(
                          [
                            ["Auto", "auto"],
                            ["Chat", "chat"],
                            ["Search", "search"],
                            ["Coding", "coding"],
                            ["Image", "imageGen"],
                            ["Presentation", "ppt"],
                          ] as const
                        ).map(([label, value]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setSelectedAgent(value);
                              setShowAgentMenu(false);
                            }}
                            className={`flex w-full rounded-md px-3 py-1.5 text-left text-xs ${selectedAgent === value ? "bg-secondary font-medium" : "hover:bg-secondary"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  disabled={isGenerating}
                  aria-label="Attach"
                  className="hidden h-8 w-8 items-center justify-center rounded-full border bg-secondary text-muted-foreground hover:bg-secondary/80 sm:flex disabled:opacity-30"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m21.4 11.6-8.8 8.8a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.7-8.7" /></svg>
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                disabled={!message.trim() || isGenerating}
                aria-label="Send message"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
              </motion.button>
            </div>
          </form>
          <div className="mt-2 flex items-center justify-between px-1 font-mono text-[11px] text-muted-foreground">
            <span>↵ send · ⇧↵ new line</span>
            <span className="hidden sm:inline">Relay routes to the right agent · Auto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
