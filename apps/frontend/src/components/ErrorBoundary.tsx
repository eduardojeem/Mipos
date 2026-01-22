import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (this.props.onError) {
      this.props.onError(error, info);
    } else {
      console.error('ErrorBoundary caught an error:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-3 text-sm text-red-600">
          Ocurrió un error al cargar este módulo.
        </div>
      );
    }
    return this.props.children;
  }
}