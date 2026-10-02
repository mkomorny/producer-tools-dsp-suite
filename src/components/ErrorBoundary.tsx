import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 bg-red-500/10 border border-red-500/30 rounded-xl">
          <h2 className="text-xl font-bold text-red-500 mb-4 tracking-wider uppercase">Something went wrong</h2>
          <div className="text-sm text-text/80 bg-neutral-900/50 p-4 rounded border border-border/40 font-mono text-left w-full max-w-2xl overflow-auto whitespace-pre-wrap max-h-48">
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold uppercase tracking-widest text-xs rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
