import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@audit.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn(email, password);
      if (res.error) {
        setError(res.error.message);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FF] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Subtle ambient light gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#98BDFF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-[#4B49AC] text-white rounded-2xl mb-4 shadow-skydash-primary">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F2C] tracking-tight">Audit & Planner</h1>
          <p className="text-xs text-[#6C7383] mt-1 font-medium">Single-User Invoice Auditing & Order Intelligence</p>
        </div>

        <div className="bg-white border border-[#ECEEF5] rounded-3xl p-8 shadow-skydash-lg">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4 text-[#8F93A0]" />}
              placeholder="admin@audit.local"
            />

            <Input
              label="Access Key / Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4 text-[#8F93A0]" />}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-2"
              isLoading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to System
            </Button>
          </form>

          <div className="mt-8 pt-5 border-t border-[#ECEEF5] text-center">
            <p className="text-[11px] text-[#8F93A0] flex items-center justify-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#4B49AC]" />
              Private Single-User Authentication (Supabase Core)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
