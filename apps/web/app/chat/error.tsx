"use client";

import { useEffect } from "react";
import ErrorState from "../../components/ErrorState";
import { getErrorMessage } from "../../lib/errors";

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Chat route error:", error);
    }, [error]);

    return (
        <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
            <ErrorState
                title="Chat couldn't load"
                message={getErrorMessage(error, "Your conversations couldn't load. Please try again.")}
                onRetry={reset}
            />
        </main>
    );
}
