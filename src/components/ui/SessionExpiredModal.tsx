import React, { useState } from 'react';
import { UserCheck, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile, signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const email = profile?.email || 'admin@audit.local';
    const res = await signIn(email, password);

    if (res.error) {
      setErrorMsg(res.error.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    } else {
      setLoading(false);
      setPassword('');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        // Prevent closing by clicking outside if session is truly expired
      }}
      title="Session Expired"
      size="sm"
    >
      <div className="space-y-4 pt-1">
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-amber-900">Your session has timed out</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Please enter your password to restore your connection without losing unsaved changes.
            </p>
          </div>
        </div>

        <form onSubmit={handleReLogin} className="space-y-3.5">
          <div className="p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#4B49AC] text-white flex items-center justify-center font-bold text-xs">
              {profile?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#1F1F2C] block truncate">{profile?.full_name || 'Auditor'}</span>
              <span className="text-[11px] text-[#6C7383] font-mono block truncate">{profile?.email || 'admin@audit.local'}</span>
            </div>
          </div>

          <Input
            label="Password"
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            icon={<Lock className="w-4 h-4" />}
          />

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              Sign In with another user
            </Button>
            <Button
              variant="primary"
              type="submit"
              size="sm"
              isLoading={loading}
              icon={<LogIn className="w-4 h-4" />}
              className="shadow-md shadow-[#4B49AC]/25 font-bold"
            >
              Unlock Session
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
