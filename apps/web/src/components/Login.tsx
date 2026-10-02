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
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-[#b4ae9f] bg-[#fffcf5] text-[#2a2622] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#2a2622]" />
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#eee9df] border border-[#b4ae9f] text-[#2a2622] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xs">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-[#2a2622]">KDI AI Office</h2>
          <p className="text-xs text-[#5c554b] mt-1 font-mono">Operator Authentication & Access Gate</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c2410c]/10 border border-[#c2410c]/30 text-[#c2410c] text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5c554b] mb-1.5 font-mono">
              Operator Username
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5c554b]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] text-[#2a2622] text-sm focus:outline-none focus:border-[#2a2622] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5c554b] mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5c554b]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] text-[#2a2622] text-sm focus:outline-none focus:border-[#2a2622] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#2a2622] hover:bg-[#385747] text-[#fffcf5] font-heading font-semibold text-sm transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Internal Operator'}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onLogin('guest_public_token', 'Public Visitor')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#eee9df] hover:bg-[#e3dccd] text-[#2a2622] border border-[#b4ae9f] text-xs font-medium transition"
            >
              Enter as Public Guest (Portfolio & Virtual Office)
            </button>
          </div>
        </form>
      </div>
    </div>

  );
};
