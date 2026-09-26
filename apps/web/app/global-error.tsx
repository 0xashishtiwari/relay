"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body>
                <main
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    <div role="alert" style={{ maxWidth: 420, textAlign: "center" }}>
                        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h1>
                        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
                            {error?.message || "The app crashed. Please reload the page."}
                        </p>
                        <button
                            type="button"
                            onClick={reset}
                            style={{
                                marginTop: 20,
                                height: 36,
                                padding: "0 16px",
                                borderRadius: 6,
                                border: 0,
                                background: "#111",
                                color: "#fff",
                                fontSize: 13,
                                cursor: "pointer",
                            }}
                        >
                            Try again
                        </button>
                    </div>
                </main>
            </body>
        </html>
    );
}
