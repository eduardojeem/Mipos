/**
 * Error Boundary for Home sections
 * Catches errors in section components and displays fallback UI
 */

'use client';

import { Component, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

interface Props {
  children: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.sectionName || 'section'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-8">
          <ErrorDisplay
            error={this.state.error}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
