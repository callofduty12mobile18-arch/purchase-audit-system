import React from 'react';
import { ShieldOff } from 'lucide-react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export const PermissionDenied: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <ShieldOff className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-sm font-medium text-slate-900">Access denied</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-xs">
        You don't have permission to view this page.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => navigate('/dashboard')}
      >
        Go to dashboard
      </Button>
    </div>
  );
};
