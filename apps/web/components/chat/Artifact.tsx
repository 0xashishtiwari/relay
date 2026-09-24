"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Artifact as GeneratedArtifact } from "../../lib/conversation";

interface ArtifactProps {
  isOpen: boolean;
  artifacts: GeneratedArtifact[];
  onClose: () => void;
}

const isHtmlFile = (name: string) => /(^|\/)index\.html?$/i.test(name);

const escapeClosingTag = (content: string, tag: string) => content.replace(new RegExp(`<\\/${tag}`, "gi"), `<\\/${tag}`);

const typeLabel = (artifact: GeneratedArtifact) => {
  const t = (artifact.type || "").toLowerCase();
  if (t.includes("code") || artifact.files.some((f) => f.name.endsWith(".tsx") || f.name.endsWith(".ts"))) return "Code";
  if (t.includes("image") || t.includes("png") || t.includes("jpg")) return "Image";
  if (t.includes("ppt") || t.includes("present")) return "Presentation";
  if (t.includes("pdf")) return "File";
  return "File";
};

export default function Artifact({ isOpen, artifacts, onClose }: ArtifactProps) {
  const shouldReduce = useReducedMotion();
  const [selectedArtifactId, setSelectedArtifactId] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [tab, setTab] = useState<"All" | "Code" | "Images" | "Files" | "Presentations">("All");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const artifact = useMemo(() => {
    if (artifacts.length === 0) return undefined;
    return artifacts.find((item) => item.id === selectedArtifactId) ?? artifacts[artifacts.length - 1];
  }, [artifacts, selectedArtifactId]);

  const file = useMemo(() => {
    if (!artifact) return undefined;
    return artifact.files.find((item) => item.name === selectedFileName) ?? artifact.files[0];
  }, [artifact, selectedFileName]);

  const previewAvailable = useMemo(() => {
    if (!artifact) return false;
    return artifact.files.some((item) => isHtmlFile(item.name));
  }, [artifact]);

  const previewSrcDoc = useMemo(() => {
    if (!artifact) return "";
    const htmlFile = artifact.files.find((item) => isHtmlFile(item.name));
    const css = artifact.files.filter((item) => item.name.toLowerCase().endsWith(".css")).map((item) => item.content).join("\n\n");
    const javascript = artifact.files.filter((item) => item.name.toLowerCase().endsWith(".js")).map((item) => item.content).join("\n\n");
    let html = htmlFile?.content ?? `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Relay Preview</title></head><body></body></html>`;
    html = html.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, "");
    html = html.replace(/<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>/gi, "");
    const styleTag = css ? `<style>\n${escapeClosingTag(css, "style")}\n</style>` : "";
    if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${styleTag}</head>`);
    else html = `${styleTag}${html}`;
    const scriptTag = javascript ? `<script>\n${escapeClosingTag(javascript, "script")}\n</script>` : "";
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${scriptTag}</body>`);
    else html += scriptTag;
    return html;
  }, [artifact]);

  const filteredArtifacts = useMemo(() => {
    if (tab === "All") return artifacts;
    return artifacts.filter((a) => {
      const label = typeLabel(a);
      if (tab === "Code") return label === "Code";
      if (tab === "Images") return label === "Image";
      if (tab === "Presentations") return label === "Presentation";
      if (tab === "Files") return label === "File";
      return true;
    });
  }, [artifacts, tab]);

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedArtifactId("");
      return;
    }
    const exists = artifacts.some((item) => item.id === selectedArtifactId);
    if (!exists) {
      const last = artifacts[artifacts.length - 1];
      if (last) setSelectedArtifactId(last.id);
    }
  }, [artifacts, selectedArtifactId]);

  useEffect(() => {
    if (!artifact) {
      setSelectedFileName("");
      return;
    }
    const exists = artifact.files.some((item) => item.name === selectedFileName);
    if (!exists) setSelectedFileName(artifact.files[0]?.name ?? "");
  }, [artifact, selectedFileName]);

  useEffect(() => {
    if (!previewAvailable) setView("code");
  }, [previewAvailable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) setProjectMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProjectMenuOpen(false);
      if (event.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const copyFile = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const downloadFile = () => {
    if (!file) return;
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.split("/").at(-1) ?? "generated-file.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectProject = (id: string) => {
    setSelectedArtifactId(id);
    setSelectedFileName("");
    setCopied(false);
    const nextArtifact = artifacts.find((item) => item.id === id);
    const hasPreview = nextArtifact?.files.some((item) => isHtmlFile(item.name)) ?? false;
    setView(hasPreview ? "preview" : "code");
    setProjectMenuOpen(false);
  };

  const selectFile = (name: string) => {
    setSelectedFileName(name);
    setCopied(false);
    if (isHtmlFile(name)) setView("preview");
    else setView("code");
  };

  const handleClose = () => {
    setProjectMenuOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  const tabs: Array<typeof tab> = ["All", "Code", "Images", "Files", "Presentations"];

  return (
    <motion.aside
      initial={shouldReduce ? { opacity: 1 } : { x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: shouldReduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full w-full shrink-0 flex-col border-t bg-background dark:bg-sidebar lg:w-[400px] lg:border-l lg:border-t-0 xl:w-[420px]"
    >
      {/* Header */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-medium tracking-tight">Artifacts</h2>
          {artifacts.length > 0 && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{artifacts.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Actions */}
          <div className="hidden items-center gap-1 sm:flex">
            <button type="button" onClick={copyFile} disabled={!file} title="Copy" className="flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-secondary disabled:opacity-40 dark:bg-[#111113]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" /></svg>
            </button>
            <button type="button" onClick={downloadFile} disabled={!file} title="Download" className="flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-secondary disabled:opacity-40 dark:bg-[#111113]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            </button>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close artifact" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      </header>

      {artifacts.length > 0 ? (
        <>
          {/* Tabs */}
          <div className="flex h-9 shrink-0 items-center gap-1 border-b bg-background px-3">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${tab === t ? "bg-card border shadow-sm dark:bg-[#111113]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Project dropdown */}
          <div className="flex h-10 shrink-0 items-center border-b bg-card px-3">
            <div ref={projectMenuRef} className="relative w-full">
              <button
                type="button"
                onClick={() => setProjectMenuOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={projectMenuOpen}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-secondary"
              >
                <span className="min-w-0 truncate">{artifact?.title ?? `Project ${Math.max(artifacts.findIndex((item) => item.id === artifact?.id) + 1, 1)}`}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`shrink-0 text-muted-foreground transition-transform ${projectMenuOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <AnimatePresence>
                {projectMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
                    role="listbox"
                  >
                    <div className="max-h-64 overflow-y-auto">
                      {filteredArtifacts.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">No {tab.toLowerCase()} artifacts</p>
                      ) : (
                        filteredArtifacts.map((item, index) => {
                          const isSelected = item.id === artifact?.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => selectProject(item.id)}
                              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs ${isSelected ? "bg-secondary font-medium" : "hover:bg-secondary"}`}
                            >
                              <div className="min-w-0">
                                <p className="truncate">{item.title ?? `Project ${index + 1}`}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{item.files.length} {item.files.length === 1 ? "file" : "files"} · {typeLabel(item)}</p>
                              </div>
                              {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex h-8 shrink-0 items-center gap-1 border-b bg-card px-3">
            {previewAvailable && (
              <button type="button" onClick={() => setView("preview")} className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-medium ${view === "preview" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Preview
              </button>
            )}
            <button type="button" onClick={() => setView("code")} className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-medium ${view === "code" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Code
            </button>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">{artifact ? `${artifact.files.length} files` : ""}</span>
          </div>

          {/* Main content */}
          <div className="flex min-h-0 flex-1">
            <nav className="w-[132px] shrink-0 overflow-y-auto border-r bg-card p-2" aria-label="Generated files">
              {artifact?.files.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => selectFile(item.name)}
                  className={`mb-0.5 block w-full truncate rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] ${file?.name === item.name ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  title={item.name}
                >
                  {item.name.split("/").pop()}
                </button>
              ))}
            </nav>

            <section className="flex min-w-0 flex-1 flex-col bg-card">
              {view === "preview" && previewAvailable ? (
                <>
                  <div className="flex h-8 shrink-0 items-center justify-between border-b px-3 dark:border-[#27272A]">
                    <span className="font-mono text-[11px] text-muted-foreground">Preview</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">Live</span>
                  </div>
                  <iframe title="Generated page preview" srcDoc={previewSrcDoc} sandbox="allow-scripts" className="min-h-0 w-full flex-1 bg-white" />
                </>
              ) : (
                <>
                  <div className="flex h-8 shrink-0 items-center justify-between border-b px-3 dark:border-[#27272A]">
                    <span className="truncate font-mono text-[11px] text-muted-foreground">{file?.name ?? "Select a file"}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={copyFile} disabled={!file} className="rounded px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-40">
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button type="button" onClick={downloadFile} disabled={!file} className="rounded px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-40">
                        Download
                      </button>
                    </div>
                  </div>
                  <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[12px] leading-6">{file?.content ?? "No file selected."}</pre>
                </>
              )}
            </section>
          </div>

          {/* List of artifacts in this conversation - compact below file list? Show as artifact cards if multiple */}
          {filteredArtifacts.length > 1 && (
            <div className="border-t bg-background p-2">
              <p className="px-2 py-1 font-mono text-[11px] text-muted-foreground">{filteredArtifacts.length} artifacts · {tab}</p>
              <div className="grid gap-1">
                {filteredArtifacts.slice(0, 3).map((a) => (
                  <button key={a.id} type="button" onClick={() => selectProject(a.id)} className={`flex items-center justify-between rounded-md border px-2.5 py-2 text-left ${a.id === artifact?.id ? "border-foreground/15 bg-card dark:bg-[#111113]" : "bg-card hover:bg-secondary dark:bg-[#111113]"}`}>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{a.title || a.files[0]?.name || "Artifact"}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{typeLabel(a)} · {a.files.length} files</p>
                    </div>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-[260px]">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground dark:bg-[#111113]">◈</div>
            <p className="mt-3 text-[13px] font-medium">No artifacts yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Generated code, images, presentations and documents from this conversation will appear here.</p>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
