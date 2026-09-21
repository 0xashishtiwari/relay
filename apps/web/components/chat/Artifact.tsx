"use client";

import { useState } from "react";

interface ArtifactProps {
  isOpen: boolean;
  onClose: () => void;
}

const Artifact = ({ isOpen, onClose }: ArtifactProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const artifactContent = `A clear starting point

This space keeps useful output close to the conversation without interrupting the thread.

Research, decisions, code, or generated content can appear here as Relay works through the task.

Next steps
01  Clarify the question
02  Choose useful evidence
03  Turn the answer into action`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifactContent);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy artifact:", error);
    }
  };

  return (
    <aside
      className="
        flex h-full w-full shrink-0 flex-col
        border-t border-border
        bg-card text-card-foreground
        lg:w-[440px]
        lg:border-l lg:border-t-0
      "
    >
      {/* Header */}
      <header
        className="
          flex h-[68px] shrink-0 items-center justify-between
          border-b border-border
          px-5
        "
      >
        <div className="flex min-w-0 items-center gap-3.5">
          {/* Artifact icon */}
          <div
            className="
              flex h-9 w-9 shrink-0 items-center justify-center
              rounded-lg
              bg-primary
              text-primary-foreground
            "
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h6" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <p className="truncate text-[15px] font-medium tracking-[-0.01em] text-foreground">
                Artifact
              </p>

              <span
                className="
                  rounded-full
                  border border-primary/20
                  bg-accent
                  px-2 py-0.5
                  text-[9px]
                  font-medium uppercase
                  tracking-[0.12em]
                  text-accent-foreground
                "
              >
                Draft
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Generated workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close artifact"
          title="Close artifact"
          className="
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-lg
            text-xl font-light
            text-muted-foreground
            transition-colors duration-200
            hover:bg-secondary
            hover:text-foreground
          "
        >
          ×
        </button>
      </header>

      {/* Toolbar */}
      <div
        className="
          flex h-12 shrink-0 items-center justify-between
          border-b border-border
          px-5
        "
      >
        <div className="flex items-center gap-1">
          <span
            className="
              mr-2.5
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-muted-foreground
            "
          >
            Document
          </span>

          <button
            type="button"
            title="Add content"
            className="
              flex h-8 items-center gap-1.5
              rounded-md
              px-2.5
              text-[11px]
              text-muted-foreground
              transition-colors duration-200
              hover:bg-secondary
              hover:text-foreground
            "
          >
            <span className="text-base leading-none">+</span>
            Add
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy artifact"
            title="Copy"
            className="
              flex h-8 min-w-8 items-center justify-center
              rounded-md
              px-2
              text-[10px]
              text-muted-foreground
              transition-colors duration-200
              hover:bg-secondary
              hover:text-foreground
            "
          >
            {copied ? (
              <span className="font-medium text-primary">
                Copied
              </span>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          <button
            type="button"
            aria-label="More artifact options"
            title="More"
            className="
              flex h-8 w-8 items-center justify-center
              rounded-md
              text-muted-foreground
              transition-colors duration-200
              hover:bg-secondary
              hover:text-foreground
            "
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-6">
          <article
            className="
              min-h-[560px]
              border border-border
              bg-background
              shadow-sm
            "
          >
            {/* Document header */}
            <div className="border-b border-border px-7 py-7">
              <div className="flex items-center justify-between">
                <span
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.2em]
                    text-primary
                  "
                >
                  Relay notes
                </span>

                <span
                  className="
                    text-[9px]
                    font-medium
                    uppercase
                    tracking-[0.15em]
                    text-muted-foreground
                  "
                >
                  Draft
                </span>
              </div>

              <h2
                className="
                  mt-6
                  text-[30px]
                  font-medium
                  leading-[1.05]
                  tracking-[-0.045em]
                  text-foreground
                "
              >
                A clear starting point
              </h2>

              <p className="mt-3 text-[12px] text-muted-foreground">
                Generated from your conversation
              </p>
            </div>

            {/* Document body */}
            <div className="px-7 py-8">
              <div className="space-y-6 text-[14px] leading-7 text-muted-foreground">
                <p>
                  This space keeps useful output close to the conversation
                  without interrupting the thread.
                </p>

                <p>
                  Research, decisions, code, or generated content can appear
                  here as Relay works through the task.
                </p>

                <div className="my-8 h-px bg-border" />

                <section>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />

                    <h3 className="text-[13px] font-medium text-foreground">
                      Next steps
                    </h3>
                  </div>

                  <ol className="mt-6 space-y-5">
                    <li className="flex gap-4">
                      <span className="font-mono text-[10px] text-primary">
                        01
                      </span>

                      <span className="text-[13px] text-muted-foreground">
                        Clarify the question
                      </span>
                    </li>

                    <li className="flex gap-4">
                      <span className="font-mono text-[10px] text-primary">
                        02
                      </span>

                      <span className="text-[13px] text-muted-foreground">
                        Choose useful evidence
                      </span>
                    </li>

                    <li className="flex gap-4">
                      <span className="font-mono text-[10px] text-primary">
                        03
                      </span>

                      <span className="text-[13px] text-muted-foreground">
                        Turn the answer into action
                      </span>
                    </li>
                  </ol>
                </section>

                {/* Empty artifact state */}
                <div
                  className="
                    mt-10
                    border border-dashed border-border
                    bg-secondary/50
                    px-5 py-6
                  "
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="
                        mt-0.5
                        flex h-8 w-8 shrink-0
                        items-center justify-center
                        rounded-md
                        border border-border
                        bg-background
                        text-muted-foreground
                      "
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      >
                        <path d="M12 3v18" />
                        <path d="M3 12h18" />
                      </svg>
                    </div>

                    <div>
                      <p className="text-[12px] font-medium text-foreground">
                        Generated artifacts
                      </p>

                      <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                        Documents, code, research notes and other outputs will
                        appear here.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document footer */}
            <div className="border-t border-border px-7 py-4">
              <div className="flex items-center justify-between">
                <span
                  className="
                    flex items-center gap-2
                    text-[10px]
                    text-muted-foreground
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Auto-saved
                </span>

                <span className="text-[10px] text-muted-foreground">
                  Relay workspace
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </aside>
  );
};

export default Artifact;