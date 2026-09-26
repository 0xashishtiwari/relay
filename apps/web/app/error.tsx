"use client";

import { useEffect } from "react";
import ErrorState from "../components/ErrorState";
import { getErrorMessage } from "../lib/errors";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Route error:", error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
            <ErrorState
                title="This page ran into a problem"
                message={getErrorMessage(error)}
                onRetry={reset}
            />
        </main>
    );
}
