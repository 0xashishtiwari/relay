"use client";

import Link from "next/link";
import ThemeToggle from "../components/theme-toggle";

const agents = [
  {
    name: "Research",
    description: "Find, compare and synthesize information.",
  },
  {
    name: "Code",
    description: "Build, debug and reason through code.",
  },
  {
    name: "Writing",
    description: "Draft, rewrite and refine your work.",
  },
  {
    name: "Analysis",
    description: "Break down problems and work with data.",
  },
];

const Page = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ───────────────── Header ───────────────── */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              R
            </span>

            <span>Relay</span>
          </Link>

          <nav className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              href="/auth"
              className="
                rounded-lg
                px-4 py-2
                text-sm
                text-muted-foreground
                transition-colors
                hover:bg-secondary
                hover:text-foreground
              "
            >
              Sign in
            </Link>

            <Link
              href="/auth"
              className="
                rounded-lg
                bg-foreground
                px-4 py-2
                text-sm font-medium
                text-background
                transition-opacity
                hover:opacity-80
              "
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ───────────────── Hero ───────────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Multi-agent workspace</span>
          </div>

          <h1
            className="
              max-w-5xl
              text-5xl
              font-medium
              leading-[0.98]
              tracking-[-0.055em]
              sm:text-7xl
              lg:text-[88px]
            "
          >
            Work with AI
            <br />
            <span className="text-muted-foreground">
              without managing it.
            </span>
          </h1>

          <div className="mt-9 flex max-w-2xl flex-col gap-8">
            <p className="text-lg leading-8 text-muted-foreground">
              Relay is a workspace where multiple AI agents can work with you
              in the same conversation. Ask what you need. Relay brings the
              right capabilities into the room.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/auth"
                className="
                  inline-flex
                  items-center
                  rounded-xl
                  bg-foreground
                  px-6
                  py-3.5
                  text-sm
                  font-medium
                  text-background
                  transition-opacity
                  hover:opacity-80
                "
              >
                Start a conversation
              </Link>

              <span className="text-sm text-muted-foreground">
                Free to get started
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── Product Preview ───────────────── */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
          <div
            className="
              overflow-hidden
              rounded-2xl
              border border-border
              bg-card
              shadow-sm
            "
          >
            {/* App header */}
            <div className="flex h-14 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                  R
                </div>

                <span className="text-sm font-medium">
                  New conversation
                </span>
              </div>

              <span className="text-xs text-muted-foreground">
                Relay 
              </span>
            </div>

            <div className="grid min-h-[470px] lg:grid-cols-[210px_minmax(0,1fr)]">
              {/* Agent sidebar */}
              <aside className="hidden border-r border-border bg-secondary/20 p-4 lg:block">
                <div className="mb-5 flex items-center justify-between px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Agents
                  </span>

                  <span className="text-[10px] text-muted-foreground">
                    4
                  </span>
                </div>

                <div className="space-y-1">
                  {agents.map((agent, index) => (
                    <div
                      key={agent.name}
                      className={`
                        rounded-lg
                        px-3 py-3
                        transition-colors
                        ${
                          index === 0
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            h-1.5
                            w-1.5
                            rounded-full
                            ${
                              index === 0
                                ? "bg-primary"
                                : "bg-muted-foreground/40"
                            }
                          `}
                        />

                        <span className="text-sm font-medium">
                          {agent.name}
                        </span>
                      </div>

                      <p className="mt-1 pl-3.5 text-[11px] leading-4 opacity-70">
                        {agent.description}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>

              {/* Conversation */}
              <div className="flex min-w-0 flex-col">
                <div className="flex-1 px-6 py-10 sm:px-10 lg:px-14">
                  <div className="mx-auto max-w-3xl">
                    {/* User message */}
                    <div className="mb-12">
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        You
                      </p>

                      <p className="max-w-2xl text-base leading-7">
                        I need to understand the trade-offs between these
                        approaches and figure out how I should implement it.
                      </p>
                    </div>

                    {/* Relay response */}
                    <div className="border-l-2 border-primary pl-5">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Relay
                        </span>

                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                          Research
                        </span>
                      </div>

                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                        I&apos;ll break down the problem first, then bring in
                        the relevant specialists when deeper research,
                        implementation or analysis is needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Composer */}
                <div className="border-t border-border p-5">
                  <div
                    className="
                      mx-auto
                      flex
                      max-w-3xl
                      items-center
                      justify-between
                      rounded-xl
                      border border-border
                      bg-background
                      px-4 py-3.5
                    "
                  >
                    <span className="text-sm text-muted-foreground">
                      Continue the conversation...
                    </span>

                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs text-background">
                      ↑
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── Core Idea ───────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="text-sm font-medium text-primary">
              The idea behind Relay
            </p>

            <h2 className="mt-5 max-w-md text-4xl font-medium leading-tight tracking-[-0.045em] sm:text-5xl">
              Stop choosing the tool before you know the problem.
            </h2>
          </div>

          <div className="max-w-2xl">
            <p className="text-xl leading-9 text-muted-foreground">
              Today, getting the most out of AI often means deciding which
              model, assistant or tool to use before you even start working.
            </p>

            <p className="mt-7 text-xl leading-9 text-muted-foreground">
              Relay puts that decision behind the conversation. You describe
              what you are trying to accomplish, and the right agents can
              contribute without making you manage the handoff.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── Agents ───────────────── */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2">
            {/* Left */}
            <div className="border-b border-border py-16 lg:border-b-0 lg:border-r lg:py-24 lg:pr-20">
              <p className="text-sm font-medium text-primary">
                One conversation
              </p>

              <h2 className="mt-5 max-w-lg text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
                Different agents can work on the same problem.
              </h2>

              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
                Relay is designed around capabilities rather than isolated
                assistants. Bring research, code, writing and analysis into
                the same workspace.
              </p>
            </div>

            {/* Agent grid */}
            <div className="grid sm:grid-cols-2">
              {agents.map((agent, index) => (
                <div
                  key={agent.name}
                  className={`
                    p-8
                    lg:p-10
                    ${
                      index < 2
                        ? "border-b border-border"
                        : ""
                    }
                    ${
                      index % 2 === 0
                        ? "sm:border-r sm:border-border"
                        : ""
                    }
                  `}
                >
                  <span className="text-xs text-muted-foreground">
                    0{index + 1}
                  </span>

                  <h3 className="mt-10 text-lg font-medium">
                    {agent.name}
                  </h3>

                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── How it works ───────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="mb-14 max-w-xl">
          <p className="text-sm font-medium text-primary">
            How Relay works
          </p>

          <h2 className="mt-5 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
            Simple on the surface.
          </h2>
        </div>

        <div className="grid border-y border-border md:grid-cols-3">
          <div className="border-b border-border py-8 md:border-b-0 md:border-r md:pr-10 md:py-10">
            <span className="text-xs text-muted-foreground">
              01
            </span>

            <h3 className="mt-8 text-lg font-medium">
              Tell Relay what you need
            </h3>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Start a conversation the same way you would talk to a capable
              teammate.
            </p>
          </div>

          <div className="border-b border-border py-8 md:border-b-0 md:border-r md:px-10 md:py-10">
            <span className="text-xs text-muted-foreground">
              02
            </span>

            <h3 className="mt-8 text-lg font-medium">
              Agents contribute
            </h3>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Relevant capabilities can enter the conversation when they are
              useful.
            </p>
          </div>

          <div className="py-8 md:pl-10 md:py-10">
            <span className="text-xs text-muted-foreground">
              03
            </span>

            <h3 className="mt-8 text-lg font-medium">
              Keep working
            </h3>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your context stays together instead of being scattered across
              different tools.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── Final CTA ───────────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8 lg:pb-32">
        <div
          className="
            rounded-2xl
            border border-border
            bg-card
            px-7 py-16
            shadow-sm
            sm:px-12
            lg:px-16
            lg:py-20
          "
        >
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">
              Relay is free to get started
            </p>

            <h2
              className="
                mt-5
                text-4xl
                font-medium
                leading-[1.05]
                tracking-[-0.045em]
                sm:text-6xl
              "
            >
              Start with the problem.
              <br />
              Not the agent.
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
              One conversation for the work you want to get done, with the
              agents you need along the way.
            </p>

            <Link
              href="/auth"
              className="
                mt-9
                inline-flex
                items-center
                rounded-xl
                bg-foreground
                px-6 py-3.5
                text-sm font-medium
                text-background
                transition-opacity
                hover:opacity-80
              "
            >
              Open Relay
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────── Footer ───────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[9px] font-bold text-primary-foreground">
              R
            </span>

            <span className="text-sm font-medium">Relay</span>
          </div>

          <span className="text-xs text-muted-foreground">
            Multi-agent workspace
          </span>
        </div>
      </footer>
    </main>
  );
};

export default Page;