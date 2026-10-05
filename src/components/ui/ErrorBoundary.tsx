import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React ErrorBoundary error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] p-8 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-rose-50 text-rose-600 mb-4 rounded-2xl border border-rose-200 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1F1F2C]">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>
          <p className="text-xs sm:text-sm text-[#6C7383] max-w-md mt-1 mb-6">
            The application encountered an unexpected runtime error. You can try refreshing the page or returning home.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              icon={<Home className="w-4 h-4" />}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReload}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
