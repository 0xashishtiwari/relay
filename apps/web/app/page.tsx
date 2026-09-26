"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Instrument_Serif } from "next/font/google";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ThemeToggle from "../components/theme-toggle";

// Expressive display serif for headlines — paired with the app's grotesk body.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

// motion variants — intentional, fast, subtle
const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const staggerSlow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
};

const OrchestratedRoute = () => {
  const [step, setStep] = useState(0);
  const shouldReduce = useReducedMotion();
  useEffect(() => {
    if (shouldReduce) {
      setStep(4);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % 5), 1500);
    return () => clearInterval(id);
  }, [shouldReduce]);

  const agents = ["Search", "Chat", "PPT"];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        animate={step >= 1 ? { borderColor: "var(--foreground)", color: "var(--foreground)" } : {}}
        transition={{ duration: 0.3 }}
        className={`rounded-full border bg-card px-3 py-1.5 text-xs font-medium ${step >= 1 ? "border-foreground text-foreground" : "border-border text-muted-foreground"}`}
      >
        Relay
      </motion.div>

      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.45, ease }}
        style={{ originY: 0 }}
        className={`h-6 w-px ${step >= 1 ? "bg-foreground" : "bg-border"}`}
      />

      <div className="flex gap-1.5">
        {agents.map((a, i) => (
          <motion.span
            key={a}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={
              step >= 2 && step < 4
                ? { opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.08, duration: 0.35, ease } }
                : step >= 4
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0.5, y: 0, scale: 1 }
            }
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide ${
              step >= 2 && step < 4 ? "border-foreground bg-foreground text-background" : step >= 4 ? "border-border bg-secondary text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {a}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: step >= 4 ? 1 : 0 }}
        transition={{ duration: 0.4, ease }}
        style={{ originY: 0 }}
        className={`mt-2 h-6 w-px ${step >= 4 ? "bg-foreground" : "bg-border"}`}
      />

      <motion.span
        animate={step >= 4 ? { backgroundColor: "var(--foreground)", color: "var(--background)" } : {}}
        transition={{ duration: 0.3 }}
        className={`rounded-full px-3 py-1 text-xs ${step >= 4 ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}
      >
        Final response
      </motion.span>
    </div>
  );
};

const StreamText = ({ text, active }: { text: string; active: boolean }) => {
  const [shown, setShown] = useState(active ? "" : text);
  useEffect(() => {
    if (!active) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, active]);
  return <span>{shown}</span>;
};

export default function Page() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setStreamKey((k) => k + 1), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* NAV */}
      <motion.header
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      >
        <div className="mx-auto flex h-[52px] max-w-[1100px] items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-semibold tracking-tight">
              Relay
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {[
                ["Agents", "#agents"],
                ["Pricing", "#pricing"],
              ].map(([label, href]) => (
                <a key={label} href={href} className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/auth" className="hidden sm:inline-flex h-8 items-center rounded-md px-3 text-[13px] text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/auth" className="group inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
                Get started
                <motion.span initial={{ x: 0 }} whileHover={{ x: 2 }} transition={{ duration: 0.2 }} className="inline-block">
                  →
                </motion.span>
              </Link>
            </motion.div>
            <button
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border md:hidden"
            >
              <motion.span key={mobileOpen ? "x" : "m"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="text-sm">
                {mobileOpen ? "×" : "≡"}
              </motion.span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease }}
              className="overflow-hidden border-t border-border bg-background px-6 md:hidden"
            >
              <nav className="flex flex-col gap-1 py-4">
                {[
                  ["Agents", "#agents"],
                  ["Pricing", "#pricing"],
                ].map(([label, href]) => (
                  <a key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                    {label}
                  </a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* HERO */}
      <section className="mx-auto max-w-[1100px] px-6 pb-8 pt-10 sm:pb-12 sm:pt-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-[900px] text-center"
        >
          <motion.p variants={item} className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            Multi-agent AI workspace
          </motion.p>

          <motion.h1 variants={item} className="mx-auto mt-4 max-w-[900px] text-pretty text-[48px] font-[560] leading-[0.92] tracking-[-0.04em] sm:text-[72px] lg:text-[84px]">
            <motion.span variants={item} className="block">
              One chat.
            </motion.span>
            <motion.span variants={item} className={`block ${serif.className} italic font-normal tracking-[-0.02em] text-foreground/75`}>
              Every agent you need.
            </motion.span>
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-6 max-w-[560px] text-pretty text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
            Relay turns a single conversation into a workspace for reasoning, coding, research, images, and presentations.
          </motion.p>

          <motion.div variants={item} className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/auth" className="group inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start building
                <motion.span className="inline-block" initial={{ x: 0 }} whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                  →
                </motion.span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <a href="#agents" className="inline-flex h-10 items-center rounded-md border bg-card px-5 text-sm font-medium hover:bg-accent transition-colors">
                Explore Relay
              </a>
            </motion.div>
          </motion.div>

          <motion.p variants={item} className="mt-4 font-mono text-[11px] tracking-wide text-muted-foreground">
            No setup required · Multiple agents · One conversation
          </motion.p>
        </motion.div>

        {/* Hero Chat Interaction */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.22 }}
          className="mx-auto mt-10 max-w-[760px]"
        >
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between border-b bg-secondary/40 px-4 py-2.5">
              <span className="font-mono text-[11px] tracking-wide text-muted-foreground">relay — new conversation</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                />
                Live
              </span>
            </div>

            <div className="grid sm:grid-cols-[1fr_220px] sm:divide-x divide-border">
              <div className="px-4 py-5 sm:px-5">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease }}
                  className="rounded-lg border bg-secondary/50 px-3.5 py-3"
                >
                  <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">You</p>
                  <p className="mt-1.5 text-[13px] leading-6">
                    <StreamText key={streamKey} active text="Research the latest trends in AI agents and turn the findings into a presentation." />
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="ml-0.5 inline-block h-3 w-px bg-foreground align-middle"
                    />
                  </p>
                </motion.div>

                <div className="my-4 flex justify-center py-2">
                  <OrchestratedRoute />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, ease, delay: 0.12 }}
                  className="rounded-lg border bg-card px-3.5 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Relay</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">search + chat + ppt</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">Synthesized 12 sources, drafted a narrative, and built a 9-slide deck. Open the artifact to preview.</p>
                  <div className="mt-3 flex gap-2">
                    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="rounded-md border bg-card px-2.5 py-1 text-xs hover:bg-secondary transition-colors">
                      View research
                    </motion.button>
                    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      Open presentation →
                    </motion.button>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ borderColor: "var(--foreground)" }}
                  className="mt-4 flex items-center justify-between rounded-md border bg-background px-3 py-2 transition-colors"
                >
                  <span className="text-xs text-muted-foreground">Ask a follow-up…</span>
                  <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.9 }} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
                    ↑
                  </motion.span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: 0.18 }}
                className="hidden border-t sm:border-t-0 sm:block bg-secondary/[0.25] p-3"
              >
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Artifact</p>
                <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-3 rounded-md border bg-card p-3">
                  <p className="font-mono text-[11px] font-medium">AI-Trends.pptx</p>
                  <div className="mt-2 space-y-1.5">
                    {[0.6, 0.4, 0.3].map((op, i) => (
                      <motion.div
                        key={i}
                        variants={item}
                        className="h-8 rounded border bg-secondary"
                        style={{ opacity: op }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">9 slides · 12 sources</p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-3 text-center font-mono text-[11px] text-muted-foreground"
          >
            Relay understands the task and coordinates the right agents automatically.
          </motion.p>
        </motion.div>
      </section>

      {/* AGENTS */}
      <motion.section
        id="agents"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerSlow}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <div className="border-y py-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
            <motion.div variants={item}>
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">The lineup</p>
              <h2 className="mt-3 text-pretty text-[30px] font-medium leading-[1.02] tracking-[-0.03em] sm:text-[42px]">
                Different agents.
                <br />
                <span className={`${serif.className} italic font-normal text-muted-foreground`}>One interface.</span>
              </h2>
              <p className="mt-4 max-w-[32ch] text-sm leading-6 text-muted-foreground">Specialized AI agents behind a single conversation — documents, images, code, and decks included.</p>
            </motion.div>

            <motion.ul variants={stagger} className="divide-y border-y">
              {[
                { name: "Chat", desc: "Reason, explain, brainstorm, and write.", icon: "◐" },
                { name: "Search", desc: "Research the web and synthesize sources.", icon: "◎" },
                { name: "Coding", desc: "Write, debug, and ship working projects.", icon: "‹›" },
                { name: "Image Q&A", desc: "Upload a photo and ask anything about it.", icon: "◈" },
                { name: "PDF Q&A", desc: "Upload a document and get grounded answers.", icon: "▤" },
                { name: "Presentations", desc: "Turn research into structured slide decks.", icon: "▭" },
              ].map((a) => (
                <motion.li
                  key={a.name}
                  variants={item}
                  className="group flex items-center justify-between gap-4 py-4 -mx-3 px-3 cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-card font-mono text-[11px] text-muted-foreground">
                      {a.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium tracking-tight">{a.name}</p>
                      <p className="text-xs leading-5 text-muted-foreground">{a.desc}</p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </motion.section>

      {/* BENTO — what one conversation can hold */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerSlow}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[16ch] text-pretty text-[28px] font-medium leading-[1.0] tracking-[-0.03em] sm:text-[40px]">
            One thread. <span className={`${serif.className} italic font-normal text-muted-foreground`}>Every output.</span>
          </h2>
          <p className="max-w-[34ch] text-sm leading-6 text-muted-foreground">Drop a file, ask a question, get back finished work — not just text.</p>
        </motion.div>

        <motion.div variants={stagger} className="mt-8 grid gap-3 sm:grid-cols-6">
          {/* PDF Q&A — large */}
          <motion.div
            variants={item}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.22, ease }}
            className="rounded-xl border bg-card p-5 sm:col-span-4"
          >
            <div className="flex h-32 items-center gap-3 overflow-hidden rounded-lg border bg-secondary/40 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-500/10 font-mono text-[10px] font-bold text-red-600 dark:text-red-400">PDF</span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-2 w-3/4 rounded bg-foreground/15" />
                <div className="h-2 w-full rounded bg-foreground/10" />
                <div className="h-2 w-5/6 rounded bg-foreground/10" />
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" /> Grounded in your file
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium tracking-tight">Ask your documents</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Upload a PDF and get answers quoted straight from its pages.</p>
          </motion.div>

          {/* Image Q&A */}
          <motion.div
            variants={item}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.22, ease }}
            className="rounded-xl border bg-card p-5 sm:col-span-2"
          >
            <div className="relative h-32 overflow-hidden rounded-lg border bg-gradient-to-br from-sky-500/25 via-violet-500/20 to-amber-500/20">
              <span className="absolute left-3 top-3 rounded-full border bg-card/90 px-2 py-0.5 font-mono text-[10px] backdrop-blur">◈ Image Q&A</span>
              <span className="absolute bottom-3 left-3 right-3 truncate rounded-md border bg-card/90 px-2 py-1 font-mono text-[10px] backdrop-blur">“What does this chart show?”</span>
            </div>
            <p className="mt-4 text-sm font-medium tracking-tight">Ask your images</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Photos, screenshots, charts — described and reasoned over.</p>
          </motion.div>

          {/* Code */}
          <motion.div
            variants={item}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.22, ease }}
            className="rounded-xl border bg-card p-5 sm:col-span-2"
          >
            <div className="h-32 space-y-2 overflow-hidden rounded-lg border bg-[#0d0d0f] p-4 font-mono text-[10px] leading-5 dark:bg-black">
              <p><span className="text-violet-400">const</span> <span className="text-zinc-100">app</span> <span className="text-zinc-500">=</span> <span className="text-emerald-400">relay()</span></p>
              <p className="pl-4"><span className="text-zinc-100">app.</span><span className="text-sky-400">route</span><span className="text-zinc-500">(</span><span className="text-amber-300">“task”</span><span className="text-zinc-500">)</span></p>
              <p className="pl-4"><span className="text-zinc-100">app.</span><span className="text-sky-400">execute</span><span className="text-zinc-500">()</span> <span className="text-emerald-400">✓</span></p>
              <p><span className="text-zinc-600">{"// shipped"}</span></p>
            </div>
            <p className="mt-4 text-sm font-medium tracking-tight">Ship code</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Write, debug, and export working projects.</p>
          </motion.div>

          {/* Decks */}
          <motion.div
            variants={item}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.22, ease }}
            className="rounded-xl border bg-card p-5 sm:col-span-2"
          >
            <div className="flex h-32 items-end justify-center gap-2 overflow-hidden rounded-lg border bg-secondary/40 p-4">
              {[["h-16", "opacity-40"], ["h-24", ""], ["h-20", "opacity-60"]].map(([h, op], i) => (
                <div key={i} className={`w-16 rounded border bg-card p-1.5 shadow-sm ${h} ${op}`}>
                  <div className="h-1.5 w-3/4 rounded bg-foreground/20" />
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1 rounded bg-foreground/10" />
                    <div className="h-1 w-5/6 rounded bg-foreground/10" />
                    <div className="h-1 w-2/3 rounded bg-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium tracking-tight">Present decks</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Research turned into editable slide narratives.</p>
          </motion.div>

          {/* Search */}
          <motion.div
            variants={item}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.22, ease }}
            className="rounded-xl border bg-card p-5 sm:col-span-2"
          >
            <div className="h-32 space-y-2 overflow-hidden rounded-lg border bg-secondary/40 p-3">
              {["12 sources synthesized", "Citations attached", "Answer with quotes"].map((t, i) => (
                <div key={t} className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-secondary font-mono text-[10px] text-muted-foreground">◎</span>
                  <p className="truncate font-mono text-[10px]">{t}</p>
                  {i === 0 && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium tracking-tight">Research the web</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Live sources, synthesized with citations.</p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* HOW RELAY THINKS — condensed to basics */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerSlow}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <motion.h2 variants={item} className="max-w-[14ch] text-pretty text-[28px] font-medium leading-[0.95] tracking-[-0.03em] sm:text-[42px]">
          You describe the task. Relay coordinates the work.
        </motion.h2>
        <motion.p variants={item} className="mt-4 max-w-[52ch] text-sm leading-6 text-muted-foreground">
          Relay understands your intent, routes it to the right specialist agents, and combines everything into one response.
        </motion.p>
        <motion.div variants={stagger} className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { n: "01", t: "Describe", d: "Ask in plain words and attach files when you have them." },
            { n: "02", t: "Relay routes", d: "The right specialist agents pick up the task on their own." },
            { n: "03", t: "Done", d: "Answers, files, and decks land back in one thread." },
          ].map((s) => (
            <motion.div
              key={s.n}
              variants={item}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2, ease }}
              className="rounded-xl border bg-card p-5"
            >
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">{s.n}</p>
              <p className="mt-2 text-sm font-medium tracking-tight">{s.t}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* FINAL CTA */}
      <motion.section
        id="pricing"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="mx-auto max-w-[1100px] px-6 py-14 sm:py-20"
      >
        <div className="border-y py-14 text-center sm:py-20">
          <motion.h2 variants={item} className="text-pretty text-[30px] font-medium leading-[0.95] tracking-[-0.03em] sm:text-[48px]">
            One conversation.
            <br />
            <span className={`${serif.className} italic font-normal text-foreground/80`}>Infinite workflows.</span>
          </motion.h2>
          <motion.p variants={item} className="mx-auto mt-4 max-w-[44ch] text-sm leading-6 text-muted-foreground">
            Bring your agents together with Relay.
          </motion.p>
          <motion.div variants={item} className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Link href="/auth" className="group inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start using Relay <motion.span className="inline-block" whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>→</motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </main>
  );
}

const Footer = () => {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="overflow-hidden border-t">
      <div className="mx-auto max-w-[1100px] px-6 pt-10 sm:pt-12">
        {/* Slim top row */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-semibold tracking-tight">Relay</p>
            <p className="mt-1 max-w-[38ch] text-[13px] leading-6 text-muted-foreground">
              One conversation with every specialist agent you need.
            </p>
          </div>
          <nav className="flex items-center gap-1" aria-label="Footer">
            {[
              ["Agents", "#agents"],
              ["Pricing", "#pricing"],
              ["Sign in", "/auth"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {label}
              </a>
            ))}
            <span className="ml-2 hidden h-3 w-px bg-border sm:inline" />
            <span className="ml-2 hidden items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Operational
            </span>
          </nav>
        </div>

        {/* Giant wordmark — cropped at the page edge */}
        <h2
          aria-label="Relay"
          className="mt-8 select-none text-center font-bold uppercase leading-[0.78] tracking-[-0.045em] sm:mt-10 -mb-[0.13em]"
          style={{
            fontFamily: "var(--font-sans-next)",
            fontSize: "clamp(4.5rem, 24vw, 23rem)",
          }}
        >
          <span className="bg-gradient-to-b from-foreground via-foreground/80 to-foreground/10 bg-clip-text text-transparent">
            Relay
          </span>
        </h2>
      </div>

      {/* Bottom bar sits on the crop line and occludes the wordmark tails */}
      <div className="relative border-t bg-background">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
          <span className="font-mono text-[11px] text-muted-foreground">© 2026 Relay</span>
          <div className="flex items-center gap-1">
            {[
              { label: "Relay on X", path: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.6 2H8l4.4 5.9L18.9 2Zm-1.1 18h1.7L7 3.9H5.2L17.8 20Z" },
              { label: "Relay on GitHub", path: "M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.3-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 22 12c0-5.5-4.5-10-10-10Z" },
              { label: "Relay on Discord", path: "M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18 18 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.2 18.1A19.9 19.9 0 0 0 6.2 21l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.1 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-2.9c.6-5.2-.9-9.7-3.6-13.7ZM8.7 15.3c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3 2.2 1 2.1 2.3c0 1.3-.9 2.3-2.1 2.3Zm6.6 0c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3 2.2 1 2.1 2.3c0 1.3-.9 2.3-2.1 2.3Z" },
            ].map(({ label, path }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
              </a>
            ))}
            <button
              type="button"
              onClick={scrollTop}
              aria-label="Back to top"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
