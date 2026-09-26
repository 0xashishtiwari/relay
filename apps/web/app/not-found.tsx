import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">404</p>
            <h1 className="mt-2 text-[22px] font-medium tracking-tight">Page not found</h1>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
                The page you&apos;re looking for doesn&apos;t exist or was moved.
            </p>
            <Link
                href="/"
                className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
                Go home
            </Link>
        </main>
    );
}
