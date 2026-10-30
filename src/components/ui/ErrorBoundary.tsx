import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={this.handleReset}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
