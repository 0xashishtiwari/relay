import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster position="top-center" expand={false} closeButton visibleToasts={3} toastOptions={{ duration: 3000, style: { fontSize: "13px", padding: "10px 14px", borderRadius: "8px", maxWidth: "360px" } as React.CSSProperties }} />
        {children}
      </body>
    </html>
  );
}
