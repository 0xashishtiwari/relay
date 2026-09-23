"use client";

import { useEffect, useMemo, useState } from "react";
import type { Artifact as GeneratedArtifact } from "../../lib/conversation";

interface ArtifactProps {
  isOpen: boolean;
  artifacts: GeneratedArtifact[];
  onClose: () => void;
}

const Artifact = ({ isOpen, artifacts, onClose }: ArtifactProps) => {
  const [selectedArtifactId, setSelectedArtifactId] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"code" | "preview">("preview");

  const artifact = useMemo(
    () => artifacts.find((item) => item.id === selectedArtifactId) ?? artifacts.at(-1),
    [artifacts, selectedArtifactId],
  );
  const file = artifact?.files.find((item) => item.name === selectedFileName) ?? artifact?.files[0];

  const previewSrcDoc = useMemo(() => {
    if (!artifact) return "";

    const htmlFile = artifact.files.find((item) => /(^|\/)index\.html?$/i.test(item.name));
    const css = artifact.files
      .filter((item) => item.name.toLowerCase().endsWith(".css"))
      .map((item) => item.content)
      .join("\n");
    const javascript = artifact.files
      .filter((item) => item.name.toLowerCase().endsWith(".js"))
      .map((item) => item.content)
      .join("\n");

    let html = htmlFile?.content ?? "<!doctype html><html><head></head><body></body></html>";

    html = html
      .replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, "")
      .replace(/<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>/gi, "");

    const styleTag = css ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : "";
    const scriptTag = javascript ? `<script>${javascript.replace(/<\/script/gi, "<\\/script")}</script>` : "";

    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${styleTag}</head>`);
    } else {
      html = `${styleTag}${html}`;
    }

    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${scriptTag}</body>`);
    } else {
      html += scriptTag;
    }

    return html;
  }, [artifact]);

  useEffect(() => {
    if (artifacts.length > 0 && !artifacts.some((item) => item.id === selectedArtifactId)) {
      setSelectedArtifactId(artifacts.at(-1)?.id ?? "");
    }
  }, [artifacts, selectedArtifactId]);

  useEffect(() => {
    if (artifact && !artifact.files.some((item) => item.name === selectedFileName)) {
      setSelectedFileName(artifact.files[0]?.name ?? "");
    }
  }, [artifact, selectedFileName]);

  const copyFile = async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadFile = () => {
    if (!file) return;
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.split("/").at(-1) ?? "generated-file.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectProject = (id: string) => {
    setSelectedArtifactId(id);
    setView("preview");
  };

  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-t border-border bg-card text-card-foreground lg:w-[520px] lg:border-l lg:border-t-0">
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-border px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="truncate text-[15px] font-medium text-foreground">Generated project</p>
            <span className="rounded-full border border-primary/20 bg-accent px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-accent-foreground">Code</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {artifact ? `${artifact.files.length} files ready to use` : "No generated files"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close artifact" title="Close artifact" className="flex h-9 w-9 items-center justify-center rounded-lg text-xl font-light text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">×</button>
      </header>

      {artifacts.length > 0 ? (
        <>
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-5">
            <label className="sr-only" htmlFor="artifact-project">Project</label>
            <select id="artifact-project" value={artifact?.id ?? ""} onChange={(event) => selectProject(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-medium text-foreground outline-none">
              {artifacts.map((item, index) => <option key={item.id} value={item.id}>{item.title || `Project ${index + 1}`}</option>)}
            </select>
          </div>

          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-4">
            <button type="button" onClick={() => setView("preview")} className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${view === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>Preview</button>
            <button type="button" onClick={() => setView("code")} className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${view === "code" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>Code</button>
          </div>

          <div className="flex min-h-0 flex-1">
            <nav className="w-[150px] shrink-0 overflow-y-auto border-r border-border p-2" aria-label="Generated files">
              {artifact?.files.map((item) => (
                <button key={item.name} type="button" onClick={() => setSelectedFileName(item.name)} className={`mb-1 block w-full truncate rounded-lg px-3 py-2 text-left text-[11px] transition-colors ${file?.name === item.name ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} title={item.name}>
                  {item.name}
                </button>
              ))}
            </nav>

            <section className="flex min-w-0 flex-1 flex-col">
              {view === "preview" ? (
                <iframe
                  title="Generated page preview"
                  srcDoc={previewSrcDoc}
                  sandbox="allow-scripts"
                  className="h-full min-h-0 w-full flex-1 bg-white"
                />
              ) : (
                <>
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
                <span className="truncate font-mono text-[11px] text-muted-foreground">{file?.name ?? "Select a file"}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={copyFile} disabled={!file} aria-label="Copy file" title="Copy file" className="rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40">{copied ? "Copied" : "Copy"}</button>
                  <button type="button" onClick={downloadFile} disabled={!file} aria-label="Download file" title="Download file" className="rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40">Download</button>
                </div>
              </div>
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-background p-4 font-mono text-[11px] leading-6 text-foreground">{file?.content ?? "No file selected."}</pre>
                </>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted-foreground">Generated files will appear here after a coding request.</div>
      )}
    </aside>
  );
};

export default Artifact;
