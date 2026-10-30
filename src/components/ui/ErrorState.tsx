import React from 'react';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  showHomeButton = false,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {message && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{message}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {showHomeButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="h-4 w-4" />}
          >
            Go home
          </Button>
        )}
      </div>
    </div>
  );
};
