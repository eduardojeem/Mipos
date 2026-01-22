"use client";
import React from 'react'

interface ErrorBoundaryProps {
  fallback?: React.ReactNode
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('POS ErrorBoundary caught error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center text-red-600">Ha ocurrido un error en el POS.</div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary