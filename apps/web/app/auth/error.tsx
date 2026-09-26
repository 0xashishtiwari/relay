"use client";

import { useEffect } from "react";
import ErrorState from "../../components/ErrorState";
import { getErrorMessage } from "../../lib/errors";

export default function AuthError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Auth route error:", error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
            <ErrorState
                title="Sign-in couldn't load"
                message={getErrorMessage(error, "The sign-in page ran into a problem. Please try again.")}
                onRetry={reset}
            />
        </main>
    );
}
