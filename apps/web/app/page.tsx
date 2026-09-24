"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ThemeToggle from "../components/theme-toggle";

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
                ["Product", "#product"],
                ["Agents", "#agents"],
                ["How it works", "#how"],
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
                  ["Product", "#product"],
                  ["Agents", "#agents"],
                  ["How it works", "#how"],
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
            <motion.span variants={item} className="block font-display font-[300] italic tracking-[-0.03em] text-foreground/70">
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
              <a href="#product" className="inline-flex h-10 items-center rounded-md border bg-card px-5 text-sm font-medium hover:bg-accent transition-colors">
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
              <h2 className="text-pretty text-[30px] font-medium leading-none tracking-[-0.03em] sm:text-[42px]">
                Different agents.
                <br />
                <span className="text-muted-foreground">One interface.</span>
              </h2>
              <p className="mt-4 max-w-[32ch] text-sm leading-6 text-muted-foreground">Relay connects specialized AI agents behind a single conversational interface.</p>
            </motion.div>

            <motion.ul variants={stagger} className="divide-y border-y">
              {[
                { name: "Chat", desc: "Reason, explain, brainstorm, and write.", icon: "◐" },
                { name: "Search", desc: "Research information and synthesize sources.", icon: "◎" },
                { name: "Coding", desc: "Write, debug, explain, and improve code.", icon: "‹›" },
                { name: "Image", desc: "Generate visuals from natural language.", icon: "◈" },
                { name: "Presentations", desc: "Turn ideas and research into structured presentations.", icon: "▭" },
              ].map((a) => (
                <motion.li
                  key={a.name}
                  variants={item}
                  whileHover={{ x: 2, backgroundColor: "var(--secondary)" }}
                  transition={{ duration: 0.18 }}
                  className="group flex items-center justify-between gap-4 py-4 -mx-3 px-3 cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <motion.span
                      whileHover={{ scale: 1.06, borderColor: "var(--foreground)" }}
                      className="flex h-7 w-7 items-center justify-center rounded-md border bg-card font-mono text-[11px] text-muted-foreground"
                    >
                      {a.icon}
                    </motion.span>
                    <div>
                      <p className="text-sm font-medium tracking-tight">{a.name}</p>
                      <p className="text-xs leading-5 text-muted-foreground">{a.desc}</p>
                    </div>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Open <span>→</span>
                  </motion.span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </motion.section>

      {/* HOW RELAY THINKS */}
      <motion.section
        id="how"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerSlow}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <motion.h2 variants={item} className="max-w-[14ch] text-pretty text-[28px] font-medium leading-[0.95] tracking-[-0.03em] sm:text-[42px]">
          You describe the task. Relay coordinates the work.
        </motion.h2>

        <div className="relative mt-8 grid gap-6 sm:grid-cols-4">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
            style={{ originX: 0 }}
            className="pointer-events-none absolute left-0 right-0 top-[18px] hidden h-px bg-border sm:block"
          />
          {[
            { n: "01 — Understand", t: "Relay interprets the user's intent." },
            { n: "02 — Route", t: "The appropriate specialized agents are selected." },
            { n: "03 — Execute", t: "Agents perform their individual tasks." },
            { n: "04 — Compose", t: "Relay combines the results into one response." },
          ].map((s) => (
            <motion.div key={s.n} variants={item} className="relative pt-2 sm:pt-6">
              <span className="relative inline-flex bg-background pr-2 font-mono text-[11px] tracking-wide text-muted-foreground">{s.n}</span>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{s.t}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={item}
          className="mt-8 rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center gap-2 text-xs"
        >
          <span className="font-mono text-muted-foreground">Relay is coordinating…</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          {["Search", "Coding", "Presentation"].map((label, i) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45 + i * 0.08, duration: 0.3 }}
              className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px]"
            >
              {label}
            </motion.span>
          ))}
          <span className="h-1 w-1 rounded-full bg-border" />
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.75, duration: 0.3 }}
            className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white"
          >
            Complete
          </motion.span>
        </motion.div>
      </motion.section>

      {/* PRODUCT DEMO */}
      <motion.section
        id="product"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <div className="border-y py-10 sm:py-14">
          <motion.div variants={item} className="mx-auto max-w-[640px] text-center">
            <h2 className="text-[28px] font-medium tracking-[-0.03em] sm:text-[40px]">A workspace that feels like a conversation.</h2>
            <p className="mx-auto mt-3 max-w-[56ch] text-sm leading-6 text-muted-foreground">One thread can produce many kinds of output. No context switching.</p>
          </motion.div>

          <motion.div
            variants={item}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.25 }}
            className="mt-8 overflow-hidden rounded-lg border bg-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b bg-secondary/30 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border bg-card" />
                <span className="h-2.5 w-2.5 rounded-full border bg-card" />
                <span className="h-2.5 w-2.5 rounded-full border bg-card" />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">Relay workspace</span>
              <span className="font-mono text-[11px] text-muted-foreground">—</span>
            </div>

            <div className="grid lg:grid-cols-[180px_1fr_220px]">
              <motion.div variants={item} className="hidden border-r bg-secondary/20 p-3 lg:block">
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
                  + New chat
                </motion.button>
                <p className="mt-4 px-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Recent</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li className="rounded-md bg-card border px-2.5 py-2 font-medium">Landing page + deck</li>
                  <li className="px-2.5 py-1.5 text-muted-foreground">Research · AI agents</li>
                  <li className="px-2.5 py-1.5 text-muted-foreground">Code review</li>
                </ul>
                <p className="mt-4 px-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Projects</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="px-2.5 py-1">Design trends 2026</li>
                  <li className="px-2.5 py-1">Relay docs</li>
                </ul>
              </motion.div>

              <div className="min-w-0 border-r">
                <div className="space-y-4 px-4 py-5 sm:px-5">
                  <motion.div variants={item}>
                    <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">You</p>
                    <div className="mt-2 rounded-lg border bg-secondary/50 px-3 py-2.5 text-[13px] leading-6">Build me a landing page for a developer tool, research the current design trends, and create a presentation explaining the concept.</div>
                  </motion.div>

                  <motion.div variants={stagger} className="space-y-1.5 font-mono text-[11px] text-muted-foreground">
                    {["Searching…", "Analyzing…", "Generating…", "Building…"].map((t, i) => (
                      <motion.p
                        key={t}
                        variants={item}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -6 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12 }}
                      >
                        <motion.span
                          animate={i < 3 ? { opacity: [1, 0.3, 1] } : {}}
                          transition={i < 3 ? { duration: 1.2, repeat: Infinity, delay: i * 0.2 } : {}}
                          className={`h-1.5 w-1.5 rounded-full ${i === 3 ? "bg-emerald-500" : "bg-foreground"}`}
                        />
                        {t}
                      </motion.p>
                    ))}
                  </motion.div>

                  <motion.div variants={item} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium">Done. Research, landing page, and deck are ready in the artifact panel →</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">All produced from one conversation, with shared context.</p>
                  </motion.div>
                </div>
                <div className="border-t p-3">
                  <motion.div whileHover={{ borderColor: "var(--foreground)" }} className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors">
                    <span className="text-xs text-muted-foreground">Continue…</span>
                    <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
                      ↑
                    </motion.span>
                  </motion.div>
                </div>
              </div>

              <motion.div variants={stagger} className="bg-secondary/20 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Artifacts</p>
                <div className="mt-3 grid gap-2">
                  {[
                    { name: "Research.md", meta: "12 sources · 840 words" },
                    { name: "LandingPage.tsx", meta: "React · Tailwind" },
                    { name: "AI-Trends.pptx", meta: "9 slides" },
                    { name: "Generated Image", meta: "1024×768 · PNG" },
                  ].map((f) => (
                    <motion.div
                      key={f.name}
                      variants={item}
                      whileHover={{ y: -2, borderColor: "var(--foreground)" }}
                      transition={{ duration: 0.2 }}
                      className="rounded-md border bg-card px-3 py-2.5 cursor-default"
                    >
                      <p className="font-mono text-xs font-medium">{f.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{f.meta}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ARTIFACTS */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerSlow}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <motion.h2 variants={item} className="text-[28px] font-medium tracking-[-0.03em] sm:text-[40px]">
          Ideas become artifacts.
        </motion.h2>
        <motion.p variants={item} className="mt-3 max-w-[52ch] text-sm leading-6 text-muted-foreground">
          Relay doesn’t only return text. It produces code, images, presentations, research, and documents you can keep.
        </motion.p>
        <motion.div variants={stagger} className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { t: "Research.md", s: "Synthesis of sources, citations included." },
            { t: "LandingPage.tsx", s: "Clean, production-ready component." },
            { t: "AI-Trends.pptx", s: "Narrative deck, 9 slides, editable." },
            { t: "cover.png", s: "Generated image, prompt-preserved." },
          ].map((a) => (
            <motion.div
              key={a.t}
              variants={item}
              whileHover={{ y: -3, boxShadow: "0 8px 20px rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.22, ease }}
              className="rounded-lg border bg-card p-4 cursor-default"
            >
              <motion.div whileHover={{ scale: 1.01 }} className="h-20 rounded-md border bg-secondary/40" />
              <p className="mt-3 font-mono text-xs font-medium">{a.t}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.s}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* MULTI-AGENT DIFFERENTIATOR */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerSlow}
        className="mx-auto max-w-[1100px] px-6 py-14 sm:py-20"
      >
        <div className="border-y py-14 sm:py-20">
          <motion.h2 variants={item} className="text-[36px] font-medium leading-none tracking-[-0.04em] sm:text-[56px]">
            Stop switching tools.
          </motion.h2>
          <motion.div variants={stagger} className="mt-8 space-y-1 font-mono text-xs leading-6 text-muted-foreground sm:text-sm">
            {["Research in one tab.", "Code in another.", "Generate images somewhere else.", "Build presentations somewhere else."].map((line) => (
              <motion.p key={line} variants={item}>
                {line}
              </motion.p>
            ))}
          </motion.div>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.3 }}
            style={{ originX: 0 }}
            className="mt-8 h-px w-12 bg-foreground/15"
          />
          <motion.p variants={item} className="mt-8 max-w-[24ch] text-[28px] font-medium leading-none tracking-[-0.03em] sm:text-[36px]">
            Relay brings them into <span className="text-muted-foreground">one conversation.</span>
          </motion.p>
        </div>
      </motion.section>

      {/* TRUST / TECHNICAL */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={stagger}
        className="mx-auto max-w-[1100px] px-6 py-10 sm:py-14"
      >
        <motion.h2 variants={item} className="text-sm font-medium tracking-tight">
          Built for serious work.
        </motion.h2>
        <motion.ul variants={stagger} className="mt-6 grid gap-3 border-y py-6 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {["Multi-agent orchestration", "Context-aware routing", "Persistent conversations", "Streaming responses", "Tool execution", "Artifact generation", "Extensible agent architecture"].map((c) => (
            <motion.li key={c} variants={item} className="flex items-center gap-2 py-1 text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-foreground/40" />
              {c}
            </motion.li>
          ))}
        </motion.ul>
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
            Infinite workflows.
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
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <a href="#" className="inline-flex h-10 items-center rounded-md border bg-card px-5 text-sm font-medium hover:bg-accent transition-colors">
                View documentation
              </a>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* FOOTER — minimal */}
      <footer className="border-t">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-[1100px] px-6 py-8"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tracking-tight">Relay</span>
              <span className="hidden sm:inline h-3 w-px bg-border" />
              <span className="text-xs text-muted-foreground">A multi-agent workspace for everything you do with AI.</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">© 2026 Relay</span>
          </div>
        </motion.div>
      </footer>
    </main>
  );
}
