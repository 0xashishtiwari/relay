"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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

interface ChatAreaProps {
  conversationId?: string;
  conversationTitle?: string;
  onConversationCreated?: (
    conversation: Conversation
  ) => void;
  onConversationUpdated?: (
    conversation: Conversation
  ) => void;
  isDesktopSidebarOpen?: boolean;
  onArtifactOpen?: () => void;
  onArtifactsChange?: (artifacts: Artifact[]) => void;
  onSidebarOpen?: () => void;
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

/* =========================================================
   SEARCH IMAGE
========================================================= */

const SearchImage = ({
  src,
  index,
}: {
  src: string;
  index: number;
}) => {
  const [hasError, setHasError] =
    useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (hasError) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open image ${index + 1} larger`}
        className="
          block
          w-full
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
          text-left
          transition-opacity
          hover:opacity-85
        "
      >
        <img
          src={src}
          alt={`Generated image ${index + 1}`}
          loading="lazy"
          onError={() => setHasError(true)}
          className="aspect-video w-full object-cover"
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Generated image ${index + 1}`}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 sm:p-8"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative max-h-[92vh] max-w-[min(92vw,1100px)] rounded-2xl border border-border bg-card p-3 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close image"
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="m6 6 12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>

              <img
                src={src}
                alt={`Generated image ${index + 1}`}
                className="max-h-[calc(92vh-24px)] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

const extractGeneratedImageUrls = (content: string) => {
  return Array.from(content.matchAll(/https?:\/\/[^\s]+/g))
    .map(([url]) => url.replace(/[),.;]+$/, ""))
    .filter(
      (url) =>
        url.includes("generated-images/") ||
        /\.(png|jpe?g|gif|webp)(?:\?|$)/i.test(url)
    );
};

/* =========================================================
   INLINE CODE
========================================================= */

const InlineCode = ({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <code className={className}>
      {children}
    </code>
  );
};

/* =========================================================
   CODE BLOCK
========================================================= */

const CodePre = ({
  children,
}: {
  children?: ReactNode;
}) => {
  const [copied, setCopied] =
    useState(false);

  const codeElement =
    children as ReactElement<{
      children?: ReactNode;
      className?: string;
    }> | null;

  const rawCode =
    codeElement?.props?.children;

  const code = String(
    rawCode ?? ""
  ).replace(/\n$/, "");

  const language =
    codeElement?.props?.className?.match(
      /language-(\w+)/
    )?.[1] ?? "code";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(
        code
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1500
      );
    } catch (error) {
      console.error(
        "Failed to copy code:",
        error
      );
    }
  };

  return (
    <div className="relay-code-card">
      <div className="relay-code-toolbar">
        <span className="relay-code-language">
          {language}
        </span>

        <button
          type="button"
          onClick={copyCode}
          aria-label="Copy code"
          title="Copy code"
          className="relay-code-copy"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre>
        {children}
      </pre>
    </div>
  );
};

/* =========================================================
   ARTIFACT CARD
========================================================= */

const ArtifactCard = ({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="
        group
        flex
        w-full
        items-center
        justify-between
        rounded-2xl
        border
        border-border
        bg-card
        p-4
        text-left
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-primary/30
        hover:bg-accent
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-primary/10
            text-primary
          "
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 18 6-6-6-6" />
            <path d="m8 6-6 6 6 6" />
          </svg>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            Generated project
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {artifact.files.length}{" "}
            {artifact.files.length === 1
              ? "file"
              : "files"}
          </p>
        </div>
      </div>

      <span
        className="
          ml-4
          shrink-0
          text-xs
          font-medium
          text-muted-foreground
          transition-colors
          group-hover:text-primary
        "
      >
        Open →
      </span>
    </button>
  );
};

/* =========================================================
   CHAT AREA
========================================================= */

const ChatArea = ({
  conversationId,
  conversationTitle = "New conversation",
  onConversationCreated,
  onConversationUpdated,
  onArtifactOpen,
  onArtifactsChange,
  onSidebarOpen,
  isDesktopSidebarOpen = true,
}: ChatAreaProps) => {
  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [artifacts, setArtifacts] =
    useState<Artifact[]>([]);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [
    isLoadingMessages,
    setIsLoadingMessages,
  ] = useState(false);

  const [sendError, setSendError] =
    useState("");

  const [selectedAgent, setSelectedAgent] =
    useState<AgentName>("auto");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  /* =======================================================
     LOAD MESSAGES
  ======================================================= */

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

        const data =
          await getMessages(conversationId);

        if (cancelled) return;

        const formattedMessages: Message[] =
          data
            .filter(
              (item) => item.role !== "system"
            )
            .map((item) => ({
              id: item._id,
              role: item.role as Message["role"],
              content: item.content,
              images: Array.from(
                new Set([
                  ...(item.images ?? []),
                  ...extractGeneratedImageUrls(item.content),
                ])
              ),
              artifacts: item.artifacts ?? [],
            }));

        setMessages(formattedMessages);
        const loadedArtifacts = formattedMessages.flatMap(
          (item) => item.artifacts ?? []
        );
        setArtifacts(loadedArtifacts);
        onArtifactsChange?.(loadedArtifacts);
        if (loadedArtifacts.length > 0) {
          onArtifactOpen?.();
        }
      } catch (error) {
        console.error(
          "Failed to load messages:",
          error
        );

        if (!cancelled) {
          setSendError(
            "Unable to load this conversation."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isGenerating]);

  /* =======================================================
     OPEN ARTIFACT
  ======================================================= */

  const openArtifact = (
    artifact: Artifact
  ) => {
    setArtifacts([artifact]);
    onArtifactOpen?.();
  };

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const sendMessage = async (
    event?: FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();

    const content = message.trim();

    if (!content || isGenerating) {
      return;
    }

    setSendError("");
    setIsGenerating(true);

    let conversationToSync:
      | Conversation
      | undefined;

    try {
      let activeConversationId =
        conversationId;

      if (!activeConversationId) {
        const createdConversation =
          await createConversationApi();

        activeConversationId =
          createdConversation._id;

        conversationToSync =
          await updateConversationApi(
            activeConversationId,
            content
          );
      } else if (messages.length === 0) {
        conversationToSync =
          await updateConversationApi(
            activeConversationId,
            content
          );
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      setMessages((current) => [
        ...current,
        userMessage,
      ]);

      setMessage("");

      const agentResponse =
        await sendAgentMessage(
          activeConversationId,
          content,
          selectedAgent
        );

      /* ---------------------------------------------------
         NORMALIZE RESPONSE
      --------------------------------------------------- */

      const responseText =
        typeof agentResponse?.response ===
        "string"
          ? agentResponse.response
          : "";

      const responseImages = Array.from(
        new Set([
          ...(Array.isArray(agentResponse?.images)
            ? agentResponse.images
            : []),
          ...extractGeneratedImageUrls(responseText),
        ])
      );

      const responseArtifacts: Artifact[] =
        Array.isArray(
          agentResponse?.artifacts
        )
          ? agentResponse.artifacts
          : [];

      /* ---------------------------------------------------
         ASSISTANT MESSAGE
      --------------------------------------------------- */

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseText,
        images: responseImages,
        artifacts:
          responseArtifacts.length > 0
            ? responseArtifacts
            : undefined,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      /* ---------------------------------------------------
         STORE ARTIFACTS
      --------------------------------------------------- */

      if (responseArtifacts.length > 0) {
        const nextArtifacts = [...artifacts, ...responseArtifacts];
        setArtifacts(nextArtifacts);
        onArtifactsChange?.(nextArtifacts);
        if (selectedAgent === "coding") {
          onArtifactOpen?.();
        }
      }

      /* ---------------------------------------------------
         CONVERSATION SYNC
      --------------------------------------------------- */

      if (conversationToSync) {
        if (conversationId) {
          onConversationUpdated?.(
            conversationToSync
          );
        } else {
          onConversationCreated?.(
            conversationToSync
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to send message:",
        error
      );

      setSendError(
        "Relay couldn't complete that request. Try again."
      );
    } finally {
      setIsGenerating(false);
      textareaRef.current?.focus();
    }
  };

  /* =======================================================
     KEYBOARD
  ======================================================= */

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  /* =======================================================
     TEXTAREA
  ======================================================= */

  const handleMessageChange = (
    value: string
  ) => {
    setMessage(value);

    const textarea =
      textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  };

  /* =======================================================
     STATES
  ======================================================= */

  const showIntro =
    Boolean(conversationId) &&
    !isLoadingMessages &&
    messages.length === 0;

  /* =======================================================
     SUGGESTIONS
  ======================================================= */

  const suggestions = [
    {
      label: "Build",
      title: "Build something",
      text: "Help me design an AI agent",
    },
    {
      label: "Research",
      title: "Research a topic",
      text: "Research a topic for me",
    },
    {
      label: "Write",
      title: "Write something",
      text: "Draft a professional document",
    },
    {
      label: "Analyze",
      title: "Analyze data",
      text: "Analyze this data",
    },
  ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="relay-fade-up flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className={`
          flex
          h-[72px]
          shrink-0
          items-center
          justify-between
          border-b
          border-border
          px-5
          sm:px-8
          ${!isDesktopSidebarOpen ? "md:pl-16" : ""}
        `}
      >
        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            onClick={onSidebarOpen}
            aria-label="Open sidebar"
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-muted-foreground
              transition-colors
              hover:bg-secondary
              hover:text-foreground
              md:hidden
            "
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1
                className="
                  truncate
                  text-[17px]
                  font-medium
                  tracking-[-0.025em]
                  text-foreground
                  sm:text-[18px]
                "
              >
                {conversationTitle}
              </h1>

              {conversationId && (
                <span
                  className="
                    hidden
                    rounded-full
                    border
                    border-border
                    bg-secondary
                    px-2.5
                    py-1
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-muted-foreground
                    sm:block
                  "
                >
                  Chat
                </span>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  ${
                    isGenerating
                      ? "animate-pulse bg-primary"
                      : "bg-primary/60"
                  }
                `}
              />

              <p className="text-[11px] font-medium text-muted-foreground">
                {isGenerating
                  ? "Relay is working"
                  : "Relay is ready"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() => {
              if (artifacts.length > 0) {
                onArtifactOpen?.();
              }
            }}
            disabled={artifacts.length === 0}
            className="
              hidden
              h-10
              items-center
              gap-2.5
              rounded-xl
              border
              border-border
              bg-background
              px-4
              text-[12px]
              font-medium
              text-muted-foreground
              transition-colors
              hover:bg-secondary
              hover:text-foreground
              disabled:cursor-not-allowed
              disabled:opacity-40
              sm:flex
            "
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h6" />
            </svg>

            Artifact
          </button>

          <button
            type="button"
            aria-label="Conversation options"
            title="More"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
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
              fill="currentColor"
            >
              <circle
                cx="5"
                cy="12"
                r="1.3"
              />
              <circle
                cx="12"
                cy="12"
                r="1.3"
              />
              <circle
                cx="19"
                cy="12"
                r="1.3"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* =====================================================
          MESSAGE AREA
      ====================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          [scrollbar-color:var(--border)_transparent]
          [scrollbar-width:thin]
        "
      >
        <div
          className="
            mx-auto
            flex
            w-full
            max-w-4xl
            flex-col
            px-5
            py-10
            sm:px-8
            lg:px-10
          "
        >

          {/* NO CONVERSATION */}

          {!conversationId && (
            <div
              className="
                flex
                min-h-[60vh]
                flex-col
                items-center
                justify-center
                px-4
                text-center
              "
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary
                  text-lg
                  font-bold
                  text-primary-foreground
                "
              >
                R
              </div>

              <p
                className="
                  mt-7
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.24em]
                  text-primary
                "
              >
                Relay
              </p>

              <h2
                className="
                  mt-4
                  max-w-2xl
                  text-[36px]
                  font-medium
                  leading-[1.08]
                  tracking-[-0.055em]
                  text-foreground
                  sm:text-[46px]
                "
              >
                Start a new conversation
              </h2>

              <p
                className="
                  mt-5
                  max-w-xl
                  text-[15px]
                  leading-7
                  text-muted-foreground
                  sm:text-[16px]
                "
              >
                Give Relay a task and let it
                coordinate the right AI agents
                for your work.
              </p>
            </div>
          )}

          {/* =================================================
              EMPTY CONVERSATION
          ================================================== */}

          {showIntro && (
            <div
              className="
                flex
                min-h-[58vh]
                flex-col
                justify-center
              "
            >
              <div className="max-w-3xl">
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary
                    text-sm
                    font-bold
                    text-primary-foreground
                  "
                >
                  R
                </div>

                <p
                  className="
                    mt-6
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.22em]
                    text-primary
                  "
                >
                  Multi-agent workspace
                </p>

                <h2
                  className="
                    mt-4
                    max-w-3xl
                    text-[40px]
                    font-medium
                    leading-[1.06]
                    tracking-[-0.055em]
                    text-foreground
                    sm:text-[52px]
                    lg:text-[58px]
                  "
                >
                  What are we working through?
                </h2>

                <p
                  className="
                    mt-5
                    max-w-2xl
                    text-[15px]
                    leading-7
                    text-muted-foreground
                    sm:text-[17px]
                  "
                >
                  Give Relay a task. It can reason
                  about the request, coordinate
                  specialist agents, and turn the
                  result into something useful.
                </p>
              </div>

              <div
                className="
                  mt-12
                  grid
                  max-w-4xl
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                "
              >
                {suggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion.text}
                      type="button"
                      onClick={() =>
                        handleMessageChange(
                          suggestion.text
                        )
                      }
                      className="
                        group
                        rounded-2xl
                        border
                        border-border
                        bg-card
                        p-5
                        text-left
                        shadow-sm
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-primary/30
                        hover:bg-accent
                      "
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[0.16em]
                            text-muted-foreground
                            transition-colors
                            group-hover:text-primary
                          "
                        >
                          {suggestion.label}
                        </span>

                        <div
                          className="
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-border
                            text-muted-foreground
                            transition-all
                            group-hover:border-primary/30
                            group-hover:text-primary
                          "
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </div>
                      </div>

                      <h3
                        className="
                          mt-5
                          text-[15px]
                          font-medium
                          tracking-[-0.015em]
                          text-foreground
                        "
                      >
                        {suggestion.title}
                      </h3>

                      <p
                        className="
                          mt-1.5
                          text-[13px]
                          leading-6
                          text-muted-foreground
                        "
                      >
                        {suggestion.text}
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* =================================================
              LOADING
          ================================================== */}

          {isLoadingMessages && (
            <div className="mx-auto w-full max-w-3xl space-y-10">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex gap-4"
                >
                  <div
                    className="
                      h-9
                      w-9
                      shrink-0
                      animate-pulse
                      rounded-xl
                      bg-secondary
                    "
                  />

                  <div className="max-w-2xl flex-1">
                    <div
                      className="
                        h-3
                        w-16
                        animate-pulse
                        rounded
                        bg-muted
                      "
                    />

                    <div className="mt-4 space-y-3">
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =================================================
              MESSAGES
          ================================================== */}

          {!isLoadingMessages &&
            messages.length > 0 && (
              <div
                className="
                  mx-auto
                  flex
                  w-full
                  max-w-3xl
                  flex-col
                  gap-10
                "
              >
                {messages.map((item) => {
                  const isUser =
                    item.role === "user";

                  return (
                    <div
                      key={item.id}
                      className={`
                        relay-message-in
                        flex
                        gap-4
                        ${
                          isUser
                            ? "justify-end"
                            : "justify-start"
                        }
                      `}
                    >
                      {!isUser && (
                        <div
                          className="
                            mt-1
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-primary
                            text-[11px]
                            font-bold
                            text-primary-foreground
                          "
                        >
                          R
                        </div>
                      )}

                      <div
                        className={`
                          max-w-[88%]
                          sm:max-w-[78%]
                          ${
                            isUser
                              ? "flex flex-col items-end"
                              : ""
                          }
                        `}
                      >
                        <div
                          className={`
                            mb-2
                            flex
                            items-center
                            gap-2
                            ${
                              isUser
                                ? "justify-end"
                                : ""
                            }
                          `}
                        >
                          <span
                            className="
                              text-[11px]
                              font-medium
                              text-muted-foreground
                            "
                          >
                            {isUser
                              ? "You"
                              : "Relay"}
                          </span>

                          {!isUser && (
                            <span
                              className="
                                rounded-full
                                border
                                border-border
                                bg-secondary
                                px-1.5
                                py-0.5
                                text-[9px]
                                uppercase
                                tracking-wider
                                text-muted-foreground
                              "
                            >
                              AI
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            isUser
                              ? `
                                rounded-2xl
                                rounded-br-md
                                bg-primary
                                px-5
                                py-3.5
                                whitespace-pre-wrap
                                break-words
                                text-[15px]
                                leading-7
                                text-primary-foreground
                                sm:text-[16px]
                              `
                              : `
                                break-words
                                text-[15px]
                                leading-7
                                text-foreground
                                sm:text-[16px]
                              `
                          }
                        >
                          {isUser ? (
                            item.content
                          ) : (
                            <div className="relay-markdown">

                              {/* MARKDOWN */}

                              {item.content && (
                                <ReactMarkdown
                                  remarkPlugins={[
                                    remarkGfm,
                                  ]}
                                  components={{
                                    /*
                                     * IMPORTANT:
                                     *
                                     * `code` only renders the
                                     * actual <code> element.
                                     *
                                     * It must NOT return a <div>.
                                     */
                                    code: InlineCode,

                                    /*
                                     * Fenced code blocks arrive
                                     * through <pre>.
                                     *
                                     * CodePre wraps the <pre>
                                     * in our custom card.
                                     */
                                    pre: CodePre,

                                    table: ({
                                      children,
                                    }) => (
                                      <div className="relay-table-wrap">
                                        <table>
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                  }}
                                >
                                  {item.content}
                                </ReactMarkdown>
                              )}

                              {/* IMAGES */}

                              {item.images &&
                                item.images.length >
                                  0 && (
                                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {item.images.map(
                                      (
                                        image,
                                        imageIndex
                                      ) => (
                                        <SearchImage
                                          key={`${image}-${imageIndex}`}
                                          src={image}
                                          index={
                                            imageIndex
                                          }
                                        />
                                      )
                                    )}
                                  </div>
                                )}

                              {/* ARTIFACTS */}

                              {item.artifacts &&
                                item.artifacts.length >
                                  0 && (
                                  <div className="mt-5 space-y-3">
                                    {item.artifacts.map(
                                      (
                                        artifact
                                      ) => (
                                        <ArtifactCard
                                          key={
                                            artifact.id
                                          }
                                          artifact={
                                            artifact
                                          }
                                          onOpen={() =>
                                            openArtifact(
                                              artifact
                                            )
                                          }
                                        />
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* =================================================
                    GENERATING
                ================================================== */}

                {isGenerating && (
                  <div className="flex gap-4">
                    <div
                      className="
                        mt-1
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-primary
                        text-[11px]
                        font-bold
                        text-primary-foreground
                      "
                    >
                      R
                    </div>

                    <div>
                      <p
                        className="
                          mb-2
                          text-[11px]
                          font-medium
                          text-muted-foreground
                        "
                      >
                        Relay
                      </p>

                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          border
                          border-border
                          bg-card
                          px-4
                          py-3
                          shadow-sm
                        "
                      >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />

                        <span className="ml-1 text-[11px] text-muted-foreground">
                          Working
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
        </div>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {sendError && (
        <div className="shrink-0 px-5 sm:px-8">
          <div
            className="
              mx-auto
              mb-3
              flex
              max-w-3xl
              items-center
              justify-between
              rounded-xl
              border
              border-destructive/20
              bg-destructive/5
              px-4
              py-3
            "
          >
            <p className="text-[12px] text-destructive">
              {sendError}
            </p>

            <button
              type="button"
              onClick={() =>
                setSendError("")
              }
              className="
                text-[11px]
                text-muted-foreground
                transition-colors
                hover:text-foreground
              "
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          COMPOSER
      ====================================================== */}

      <div className="shrink-0 px-5 pb-5 sm:px-8 sm:pb-7">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={sendMessage}
            className={`
              rounded-[22px]
              border
              p-2.5
              transition-all
              duration-200
              ${
                conversationId ||
                message.trim()
                  ? `
                    border-border
                    bg-card
                    shadow-sm
                    focus-within:border-ring
                    focus-within:shadow-md
                  `
                  : `
                    border-border
                    bg-secondary
                    opacity-60
                  `
              }
            `}
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) =>
                handleMessageChange(
                  event.target.value
                )
              }
              onKeyDown={handleKeyDown}
              placeholder={
                conversationId
                  ? "Message Relay..."
                  : "Start a conversation..."
              }
              disabled={isGenerating}
              rows={1}
              className="
                max-h-44
                min-h-[58px]
                w-full
                resize-none
                overflow-y-auto
                bg-transparent
                px-4
                py-3.5
                text-[15px]
                leading-7
                text-foreground
                outline-none
                placeholder:text-muted-foreground
                disabled:cursor-not-allowed
                sm:text-[16px]
              "
            />

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">

                <button
                  type="button"
                  disabled={isGenerating}
                  aria-label="Attach file"
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    text-muted-foreground
                    transition-colors
                    hover:bg-secondary
                    hover:text-foreground
                    disabled:opacity-30
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
                    <path d="m21.4 11.6-8.8 8.8a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.7-8.7" />
                  </svg>
                </button>

                <label className="hidden sm:flex">
                  <span className="sr-only">
                    Agent mode
                  </span>

                  <select
                    value={selectedAgent}
                    onChange={(event) =>
                      setSelectedAgent(
                        event.target.value as AgentName
                      )
                    }
                    disabled={isGenerating}
                    className="
                      h-9
                      rounded-xl
                      bg-transparent
                      px-3
                      text-[11px]
                      font-medium
                      text-muted-foreground
                      outline-none
                      transition-colors
                      hover:bg-secondary
                      hover:text-foreground
                      disabled:opacity-30
                    "
                  >
                    <option value="auto">
                      Auto
                    </option>

                    <option value="chat">
                      Chat
                    </option>

                    <option value="search">
                      Search
                    </option>

                    <option value="ppt">
                      PPT
                    </option>

                    <option value="pdf">
                      PDF
                    </option>

                    <option value="coding">
                      Coding
                    </option>

                    <option value="imageGen">
                      Image generation
                    </option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  !message.trim() ||
                  isGenerating
                }
                aria-label="Send message"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary
                  text-primary-foreground
                  transition-all
                  hover:opacity-85
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-20
                "
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>

          <div className="mt-2.5 flex items-center justify-between px-2">
            <p className="text-[10px] text-muted-foreground">
              Enter to send · Shift + Enter for new line
            </p>

            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Relay AI
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatArea;