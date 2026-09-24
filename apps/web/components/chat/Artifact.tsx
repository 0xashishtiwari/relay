"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Artifact as GeneratedArtifact } from "../../lib/conversation";

interface ArtifactProps {
  isOpen: boolean;
  artifacts: GeneratedArtifact[];
  onClose: () => void;
}

/* =========================================================
   HELPERS
========================================================= */

const isHtmlFile = (name: string) => {
  return /(^|\/)index\.html?$/i.test(name);
};

const escapeClosingTag = (
  content: string,
  tag: string
) => {
  return content.replace(
    new RegExp(`<\\/${tag}`, "gi"),
    `<\\/${tag}`
  );
};

/* =========================================================
   ARTIFACT
========================================================= */

const Artifact = ({
  isOpen,
  artifacts,
  onClose,
}: ArtifactProps) => {
  const [selectedArtifactId, setSelectedArtifactId] =
    useState("");

  const [selectedFileName, setSelectedFileName] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [view, setView] =
    useState<"code" | "preview">("preview");

  const [projectMenuOpen, setProjectMenuOpen] =
    useState(false);

  const projectMenuRef =
    useRef<HTMLDivElement>(null);

  /* =======================================================
     CURRENT ARTIFACT
  ======================================================= */

  const artifact = useMemo(() => {
    if (artifacts.length === 0) {
      return undefined;
    }

    return (
      artifacts.find(
        (item) =>
          item.id === selectedArtifactId
      ) ?? artifacts[artifacts.length - 1]
    );
  }, [
    artifacts,
    selectedArtifactId,
  ]);

  /* =======================================================
     CURRENT FILE
  ======================================================= */

  const file = useMemo(() => {
    if (!artifact) {
      return undefined;
    }

    return (
      artifact.files.find(
        (item) =>
          item.name === selectedFileName
      ) ?? artifact.files[0]
    );
  }, [
    artifact,
    selectedFileName,
  ]);

  /* =======================================================
     PREVIEW AVAILABLE
  ======================================================= */

  const previewAvailable = useMemo(() => {
    if (!artifact) {
      return false;
    }

    return artifact.files.some((item) =>
      isHtmlFile(item.name)
    );
  }, [artifact]);

  /* =======================================================
     PREVIEW HTML
  ======================================================= */

  const previewSrcDoc = useMemo(() => {
    if (!artifact) {
      return "";
    }

    const htmlFile = artifact.files.find(
      (item) => isHtmlFile(item.name)
    );

    const css = artifact.files
      .filter((item) =>
        item.name
          .toLowerCase()
          .endsWith(".css")
      )
      .map((item) => item.content)
      .join("\n\n");

    const javascript = artifact.files
      .filter((item) =>
        item.name
          .toLowerCase()
          .endsWith(".js")
      )
      .map((item) => item.content)
      .join("\n\n");

    let html =
      htmlFile?.content ??
      `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Relay Preview</title>
  </head>
  <body></body>
</html>`;

    /* -----------------------------------------------------
       Remove external CSS references
    ----------------------------------------------------- */

    html = html.replace(
      /<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi,
      ""
    );

    /* -----------------------------------------------------
       Remove external JS references
    ----------------------------------------------------- */

    html = html.replace(
      /<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>/gi,
      ""
    );

    /* -----------------------------------------------------
       Inject CSS
    ----------------------------------------------------- */

    const styleTag = css
      ? `<style>
${escapeClosingTag(css, "style")}
</style>`
      : "";

    if (/<\/head>/i.test(html)) {
      html = html.replace(
        /<\/head>/i,
        `${styleTag}</head>`
      );
    } else {
      html = `${styleTag}${html}`;
    }

    /* -----------------------------------------------------
       Inject JavaScript
    ----------------------------------------------------- */

    const scriptTag = javascript
      ? `<script>
${escapeClosingTag(javascript, "script")}
</script>`
      : "";

    if (/<\/body>/i.test(html)) {
      html = html.replace(
        /<\/body>/i,
        `${scriptTag}</body>`
      );
    } else {
      html += scriptTag;
    }

    return html;
  }, [artifact]);

  /* =======================================================
     KEEP SELECTED ARTIFACT VALID
  ======================================================= */

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedArtifactId("");
      return;
    }

    const exists = artifacts.some(
      (item) =>
        item.id === selectedArtifactId
    );

    if (!exists) {
      setSelectedArtifactId(
        artifacts[artifacts.length - 1].id
      );
    }
  }, [
    artifacts,
    selectedArtifactId,
  ]);

  /* =======================================================
     KEEP SELECTED FILE VALID
  ======================================================= */

  useEffect(() => {
    if (!artifact) {
      setSelectedFileName("");
      return;
    }

    const exists = artifact.files.some(
      (item) =>
        item.name === selectedFileName
    );

    if (!exists) {
      setSelectedFileName(
        artifact.files[0]?.name ?? ""
      );
    }
  }, [
    artifact,
    selectedFileName,
  ]);

  /* =======================================================
     PREVIEW / CODE MODE
  ======================================================= */

  useEffect(() => {
    if (!previewAvailable) {
      setView("code");
    }
  }, [previewAvailable]);

  /* =======================================================
     CLOSE PROJECT DROPDOWN WHEN CLICKING OUTSIDE
  ======================================================= */

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setProjectMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =======================================================
     CLOSE DROPDOWN WITH ESC
  ======================================================= */

  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setProjectMenuOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =======================================================
     COPY FILE
  ======================================================= */

  const copyFile = async () => {
    if (!file) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        file.content
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error(
        "Failed to copy file:",
        error
      );
    }
  };

  /* =======================================================
     DOWNLOAD FILE
  ======================================================= */

  const downloadFile = () => {
    if (!file) {
      return;
    }

    const blob = new Blob(
      [file.content],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      file.name.split("/").at(-1) ??
      "generated-file.txt";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* =======================================================
     SELECT PROJECT
  ======================================================= */

  const selectProject = (id: string) => {
    setSelectedArtifactId(id);
    setSelectedFileName("");
    setCopied(false);

    const nextArtifact =
      artifacts.find(
        (item) => item.id === id
      );

    const hasPreview =
      nextArtifact?.files.some(
        (item) => isHtmlFile(item.name)
      ) ?? false;

    setView(
      hasPreview
        ? "preview"
        : "code"
    );

    setProjectMenuOpen(false);
  };

  /* =======================================================
     SELECT FILE
  ======================================================= */

  const selectFile = (name: string) => {
    setSelectedFileName(name);
    setCopied(false);

    if (isHtmlFile(name)) {
      setView("preview");
    } else {
      setView("code");
    }
  };

  /* =======================================================
     CLOSE ARTIFACT
  ======================================================= */

  const handleClose = () => {
    setProjectMenuOpen(false);
    onClose();
  };

  /* =======================================================
     CLOSED
  ======================================================= */

  if (!isOpen) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <aside
      className="
        flex
        h-full
        w-full
        shrink-0
        flex-col
        border-t
        border-border
        bg-card
        text-card-foreground
        lg:w-[520px]
        lg:border-l
        lg:border-t-0
      "
    >
      {/* ===================================================
          HEADER
      ================================================== */}

      <header
        className="
          flex
          h-[68px]
          shrink-0
          items-center
          justify-between
          border-b
          border-border
          px-5
        "
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <p
              className="
                truncate
                text-[15px]
                font-medium
                tracking-[-0.01em]
                text-foreground
              "
            >
              Generated project
            </p>

            <span
              className="
                rounded-full
                border
                border-primary/20
                bg-accent
                px-2
                py-0.5
                text-[9px]
                font-medium
                uppercase
                tracking-[0.12em]
                text-accent-foreground
              "
            >
              Code
            </span>
          </div>

          <p
            className="
              mt-0.5
              text-[11px]
              text-muted-foreground
            "
          >
            {artifact
              ? `${artifact.files.length} ${
                  artifact.files.length === 1
                    ? "file"
                    : "files"
                } ready to use`
              : "No generated files"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close artifact"
          title="Close artifact"
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            text-xl
            font-light
            text-muted-foreground
            transition-colors
            hover:bg-secondary
            hover:text-foreground
          "
        >
          ×
        </button>
      </header>

      {/* ===================================================
          CONTENT
      ================================================== */}

      {artifacts.length > 0 ? (
        <>
          {/* ===============================================
              CUSTOM PROJECT DROPDOWN
          ============================================== */}

          <div
            className="
              flex
              h-12
              shrink-0
              items-center
              border-b
              border-border
              px-4
            "
          >
            <div
              ref={projectMenuRef}
              className="relative w-full"
            >
              <button
                type="button"
                onClick={() =>
                  setProjectMenuOpen(
                    (open) => !open
                  )
                }
                aria-haspopup="listbox"
                aria-expanded={
                  projectMenuOpen
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  gap-3
                  rounded-lg
                  bg-transparent
                  px-3
                  py-2
                  text-left
                  text-xs
                  font-medium
                  text-foreground
                  outline-none
                  transition-colors
                  hover:bg-secondary
                  focus:bg-secondary
                "
              >
                <span className="min-w-0 truncate">
                  {artifact?.title ??
                    `Project ${
                      Math.max(
                        artifacts.findIndex(
                          (item) =>
                            item.id ===
                            artifact?.id
                        ) + 1,
                        1
                      )
                    }`}
                </span>

                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`
                    shrink-0
                    text-muted-foreground
                    transition-transform
                    duration-200
                    ${
                      projectMenuOpen
                        ? "rotate-180"
                        : ""
                    }
                  `}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* =========================================
                  DROPDOWN MENU
              ========================================= */}

              {projectMenuOpen && (
                <div
                  className="
                    absolute
                    left-0
                    right-0
                    top-full
                    z-50
                    mt-1.5
                    overflow-hidden
                    rounded-xl
                    border
                    border-border
                    bg-popover
                    p-1
                    shadow-xl
                    shadow-black/10
                    dark:shadow-black/30
                  "
                  role="listbox"
                >
                  <div className="max-h-64 overflow-y-auto">
                    {artifacts.map(
                      (item, index) => {
                        const isSelected =
                          item.id ===
                          artifact?.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={
                              isSelected
                            }
                            onClick={() =>
                              selectProject(
                                item.id
                              )
                            }
                            className={`
                              flex
                              w-full
                              items-center
                              justify-between
                              gap-3
                              rounded-lg
                              px-3
                              py-2.5
                              text-left
                              text-xs
                              transition-colors
                              ${
                                isSelected
                                  ? "bg-accent text-accent-foreground"
                                  : "text-foreground hover:bg-secondary"
                              }
                            `}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {item.title ??
                                  `Project ${
                                    index +
                                    1
                                  }`}
                              </p>

                              <p
                                className={`
                                  mt-0.5
                                  text-[10px]
                                  ${
                                    isSelected
                                      ? "text-accent-foreground/70"
                                      : "text-muted-foreground"
                                  }
                                `}
                              >
                                {
                                  item.files
                                    .length
                                }{" "}
                                {item.files
                                  .length ===
                                1
                                  ? "file"
                                  : "files"}
                              </p>
                            </div>

                            {isSelected && (
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="shrink-0"
                              >
                                <path d="m5 12 4 4L19 6" />
                              </svg>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===============================================
              VIEW SWITCHER
          ============================================== */}

          <div
            className="
              flex
              h-11
              shrink-0
              items-center
              gap-1
              border-b
              border-border
              px-4
            "
          >
            {previewAvailable && (
              <button
                type="button"
                onClick={() =>
                  setView("preview")
                }
                className={`
                  rounded-md
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  transition-colors
                  ${
                    view === "preview"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                Preview
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setView("code")
              }
              className={`
                rounded-md
                px-3
                py-1.5
                text-[11px]
                font-medium
                transition-colors
                ${
                  view === "code"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }
              `}
            >
              Code
            </button>
          </div>

          {/* ===============================================
              MAIN CONTENT
          ============================================== */}

          <div className="flex min-h-0 flex-1">
            {/* =============================================
                FILE SIDEBAR
            ============================================ */}

            <nav
              className="
                w-[150px]
                shrink-0
                overflow-y-auto
                border-r
                border-border
                p-2
              "
              aria-label="Generated files"
            >
              {artifact?.files.map(
                (item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() =>
                      selectFile(
                        item.name
                      )
                    }
                    className={`
                      mb-1
                      block
                      w-full
                      truncate
                      rounded-lg
                      px-3
                      py-2
                      text-left
                      text-[11px]
                      transition-colors
                      ${
                        file?.name ===
                        item.name
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }
                    `}
                    title={item.name}
                  >
                    {item.name}
                  </button>
                )
              )}
            </nav>

            {/* =============================================
                FILE / PREVIEW AREA
            ============================================ */}

            <section
              className="
                flex
                min-w-0
                flex-1
                flex-col
              "
            >
              {view === "preview" &&
              previewAvailable ? (
                <>
                  {/* Preview toolbar */}

                  <div
                    className="
                      flex
                      h-11
                      shrink-0
                      items-center
                      justify-between
                      border-b
                      border-border
                      px-4
                    "
                  >
                    <span
                      className="
                        truncate
                        font-mono
                        text-[11px]
                        text-muted-foreground
                      "
                    >
                      Preview
                    </span>

                    <span
                      className="
                        rounded-md
                        bg-secondary
                        px-2
                        py-1
                        text-[9px]
                        font-medium
                        uppercase
                        tracking-[0.08em]
                        text-muted-foreground
                      "
                    >
                      Live
                    </span>
                  </div>

                  <iframe
                    title="Generated page preview"
                    srcDoc={previewSrcDoc}
                    sandbox="allow-scripts"
                    className="
                      min-h-0
                      w-full
                      flex-1
                      bg-white
                    "
                  />
                </>
              ) : (
                <>
                  {/* Code toolbar */}

                  <div
                    className="
                      flex
                      h-11
                      shrink-0
                      items-center
                      justify-between
                      border-b
                      border-border
                      px-4
                    "
                  >
                    <span
                      className="
                        truncate
                        font-mono
                        text-[11px]
                        text-muted-foreground
                      "
                    >
                      {file?.name ??
                        "Select a file"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={copyFile}
                        disabled={!file}
                        aria-label="Copy file"
                        title="Copy file"
                        className="
                          rounded-md
                          px-2
                          py-1
                          text-[10px]
                          text-muted-foreground
                          transition-colors
                          hover:bg-secondary
                          hover:text-foreground
                          disabled:opacity-40
                        "
                      >
                        {copied
                          ? "Copied"
                          : "Copy"}
                      </button>

                      <button
                        type="button"
                        onClick={
                          downloadFile
                        }
                        disabled={!file}
                        aria-label="Download file"
                        title="Download file"
                        className="
                          rounded-md
                          px-2
                          py-1
                          text-[10px]
                          text-muted-foreground
                          transition-colors
                          hover:bg-secondary
                          hover:text-foreground
                          disabled:opacity-40
                        "
                      >
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Code */}

                  <pre
                    className="
                      min-h-0
                      flex-1
                      overflow-auto
                      whitespace-pre-wrap
                      break-words
                      bg-background
                      p-4
                      font-mono
                      text-[11px]
                      leading-6
                      text-foreground
                    "
                  >
                    {file?.content ??
                      "No file selected."}
                  </pre>
                </>
              )}
            </section>
          </div>
        </>
      ) : (
        /* =================================================
           EMPTY STATE
        ================================================== */

        <div
          className="
            flex
            flex-1
            items-center
            justify-center
            px-8
            text-center
            text-sm
            text-muted-foreground
          "
        >
          <div className="max-w-xs">
            <div
              className="
                mx-auto
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-secondary
                text-primary
              "
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m16 18 6-6-6-6" />
                <path d="m8 6-6 6 6 6" />
              </svg>
            </div>

            <p className="mt-4 font-medium text-foreground">
              No generated files
            </p>

            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Generated files will appear
              here after a coding request.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Artifact;