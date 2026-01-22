"use client";
import React, { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 border rounded bg-muted">
            <p className="font-medium">Ha ocurrido un error en esta sección.</p>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;