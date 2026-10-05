import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  showHomeButton?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to Load Records',
  message = 'An unexpected database error or network interruption occurred while loading this page.',
  error,
  onRetry,
  showHomeButton = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-rose-200 bg-white shadow-skydash animate-in fade-in duration-200 ${className}`}
    >
      <div className="p-4 bg-rose-50 text-rose-600 mb-4 rounded-2xl border border-rose-200 shadow-xs">
        <AlertCircle className="w-8 h-8 text-rose-600" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#1F1F2C] tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-[#6C7383] max-w-md mt-1.5 mb-6 leading-relaxed">
        {message}
      </p>

      {errorMessage && (
        <div className="w-full max-w-md mb-6 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-xs font-semibold text-[#6C7383] hover:text-[#1F1F2C] py-1.5 px-3 rounded-lg bg-[#F5F7FF] border border-[#ECEEF5]"
          >
            <span>Technical Error Details</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showDetails && (
            <pre className="mt-2 p-3 bg-slate-900 text-rose-300 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap border border-slate-800">
              {errorMessage}
            </pre>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {showHomeButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="w-3.5 h-3.5" />}
            className="rounded-xl px-4 py-2"
          >
            Dashboard
          </Button>
        )}
        {onRetry && (
          <Button
            variant="primary"
            size="sm"
            onClick={onRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="rounded-xl px-5 py-2 shadow-md shadow-[#4B49AC]/25 font-bold"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};
