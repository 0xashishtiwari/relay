"use client";

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
}

/** Reusable inline error panel matching the app's quiet card aesthetic. */
export default function ErrorState({
    title = "Something went wrong",
    message = "Please try again. If the problem persists, refresh the page.",
    onRetry,
    retryLabel = "Try again",
}: ErrorStateProps) {
    return (
        <div
            role="alert"
            className="mx-auto flex w-full max-w-md flex-col items-center rounded-xl border bg-card px-6 py-8 text-center shadow-sm"
        >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-sm font-semibold text-destructive">
                !
            </span>
            <h2 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{message}</p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 h-9 rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {retryLabel}
                </button>
            )}
        </div>
    );
}
