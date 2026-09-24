import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-next",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-next",
  display: "swap",
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Relay — One chat. Every agent you need.",
  description: "Relay turns one conversation into a workspace for reasoning, coding, research, images, and presentations. One conversation. Multiple specialized agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const theme = localStorage.getItem("relay-theme");
              document.documentElement.classList.toggle("dark", theme !== "light");
              document.documentElement.classList.toggle("light", theme === "light");
            })();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${newsreader.variable} antialiased`}>
        <Toaster position="top-center" expand={false} closeButton visibleToasts={3} toastOptions={{ duration: 3000, style: { fontSize: "13px", padding: "10px 14px", borderRadius: "8px", maxWidth: "360px" } as React.CSSProperties }} />
        {children}
      </body>
    </html>
  );
}
