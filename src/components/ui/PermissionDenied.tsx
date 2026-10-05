import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface PermissionDeniedProps {
  title?: string;
  description?: string;
  requiredRole?: string;
  showBack?: boolean;
  className?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  title = 'Permission Denied',
  description = 'You do not have administrative privileges to view or perform operations on this page.',
  requiredRole = 'ADMIN',
  showBack = true,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-amber-200 bg-white shadow-skydash animate-in fade-in duration-200 ${className}`}
    >
      <div className="p-4 bg-amber-50 text-amber-600 mb-4 rounded-2xl border border-amber-200 shadow-xs relative">
        <ShieldAlert className="w-8 h-8 text-amber-600" />
        <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full border border-amber-200 shadow-xs">
          <Lock className="w-3.5 h-3.5 text-amber-700" />
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#1F1F2C] tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-[#6C7383] max-w-md mt-1.5 mb-2 leading-relaxed">
        {description}
      </p>

      {requiredRole && (
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#F5F7FF] border border-[#ECEEF5] text-[#4B49AC] font-bold mb-6">
          Required Role: {requiredRole}
        </span>
      )}

      {showBack && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/dashboard')}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="rounded-xl px-5 py-2 shadow-md shadow-[#4B49AC]/25 font-bold"
        >
          Return to Dashboard
        </Button>
      )}
    </div>
  );
};
