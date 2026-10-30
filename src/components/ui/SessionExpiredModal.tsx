import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { useAuth } from '../../hooks/useAuth';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
}) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('admin@audit.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error.message);
      } else {
        onSuccess();
      }
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session expired"
      subtitle="Your session has expired. Please sign in again to continue."
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">You have been signed out. Re-authenticate to continue.</p>
        </div>

        <form onSubmit={handleReauth} className="space-y-3">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
