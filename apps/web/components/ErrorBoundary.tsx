"use client";

import { Component, ReactNode } from "react";
import ErrorState from "./ErrorState";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    message: string;
}

/** Class boundary for component-tree crashes outside App Router segments. */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: "" };

    static getDerivedStateFromError(error: unknown): State {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : "An unexpected error occurred.",
        };
    }

    componentDidCatch(error: unknown) {
        console.error("ErrorBoundary caught:", error);
    }

    private handleReset = () => {
        this.setState({ hasError: false, message: "" });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex min-h-[40vh] items-center justify-center p-6">
                    <ErrorState message={this.state.message} onRetry={this.handleReset} />
                </div>
            );
        }
        return this.props.children;
    }
}
