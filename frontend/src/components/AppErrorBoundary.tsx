"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * AppErrorBoundary — isolates the runtime error of any panel
 * component on the app screen and renders a visible message
 * instead of a blank page.
 *
 * Lives in its own file (and in its own module) because mixing
 * a class component declaration that uses inline generic type
 * parameters (`extends Component<{...}, {...}>`) with JSX in
 * the same file makes SWC's parser misread the `>` of the
 * generic as a JSX close tag. The bug surfaced as
 * "Unexpected token. Expected jsx identifier" at the wrap site
 * — which had nothing to do with the wrap. Keeping the class
 * here keeps the page.tsx parse path clean.
 */

type Props = {
  children: ReactNode;
  onReset: () => void;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Loudly so we see it during dev. In prod, hand off to
    // whatever error pipeline you wire up (Sentry, etc.).
    // eslint-disable-next-line no-console
    console.error("[Cashinviz] App render crashed:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-2xl w-full bg-[var(--card)] border border-amber-500/40 rounded-[var(--radius-lg)] p-6">
          <p className="text-amber-300 text-[13px] font-semibold mb-1">
            App render crashed
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mb-4">
            One of the panels threw during render. Error + stack below.
          </p>
          <pre className="text-[11px] text-[var(--text-secondary)] overflow-auto bg-[var(--bg)] border border-[var(--border-subtle)] p-3 rounded-md mb-4 max-h-[320px] whitespace-pre-wrap">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="btn-primary px-4 py-2 text-[13px]"
            >
              Back to landing
            </button>
            <button
              onClick={this.retry}
              className="btn-secondary px-4 py-2 text-[13px]"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
