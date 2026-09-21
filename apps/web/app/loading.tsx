export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <div
          className="
            flex h-11 w-11
            items-center justify-center
            rounded-lg
            bg-primary
            text-sm font-semibold
            text-primary-foreground
          "
        >
          R
        </div>

        <div className="mt-6 flex items-center gap-1.5">
          <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
          <span
            className="h-1 w-1 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1 w-1 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </main>
  );
}