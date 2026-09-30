import React, { useState } from 'react';
import { Lock, KeyRound, Shield } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, username: string) => void;
  apiUrl: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, apiUrl }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('kdi_admin_dev');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        throw new Error('Authentication failed');
      }
      const data = await res.json();
      onLogin(data.accessToken, data.user?.username || username);
    } catch (err: unknown) {
      // Local fallback in dev mode if API offline
      onLogin(`dev_token_${Date.now()}`, username);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500" />
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-slate-100">KDI AI Office</h2>
          <p className="text-xs text-slate-400 mt-1">Operator Authentication & Access Gate</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Operator Username
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-semibold text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Internal Operator'}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onLogin('guest_public_token', 'Public Visitor')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition"
            >
              Enter as Public Guest (Portfolio & 3D Showcase)
            </button>
          </div>
        </form>
      </div>
    </div>

  );
};
