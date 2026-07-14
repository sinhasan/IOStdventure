import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BloombergBackground from '@/components/crm/BloombergBackground';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = new URLSearchParams();
      body.append('username', email);
      body.append('password', password);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!res.ok) throw new Error('Login failed');

      const data = await res.json();
      if (data.access_token) localStorage.setItem('tdventure_token', data.access_token);

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <BloombergBackground />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-lime-500/10 to-transparent" />
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyan-500/10 to-transparent" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="mb-6 inline-flex rounded-full border border-lime-500/40 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.35em] text-lime-300">
              TD Venture CRM
            </div>

            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight">
              Startup Capital CRM
              <span className="block text-lime-300">Deal Desk Command Center</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-gray-400">
              Manage startup discovery, investor workflows, opportunity movement, internal notes,
              IC readiness and follow-ups from one high-speed operating screen.
            </p>

            <div className="mt-8 grid max-w-3xl grid-cols-3 gap-4">
              {[
                ['CRM', 'Deal Desk'],
                ['AI', 'Confidence'],
                ['OPS', 'Follow-up'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-lime-500/30 bg-black/60 p-4 shadow-[0_0_25px_rgba(163,255,18,0.08)]">
                  <div className="text-xs tracking-[0.35em] text-gray-500">{label}</div>
                  <div className="mt-3 text-xl font-semibold text-lime-300">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-cyan-500/30 bg-black/60 p-5">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-cyan-300">
                <span>Operator Console</span>
                <span>Secure Access</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-400">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">Startup & Investor CRM</div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">Opportunity Workspace</div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">Follow-up Pack</div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">IC Notes & Risk Radar</div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="mb-5 text-center lg:hidden">
              <div className="text-xs uppercase tracking-[0.35em] text-lime-300">TD Venture CRM</div>
              <h1 className="mt-3 text-3xl font-semibold">Startup Capital CRM</h1>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-lime-500/40 bg-black/80 p-6 shadow-[0_0_45px_rgba(163,255,18,0.16)] backdrop-blur"
            >
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-gray-500">Secure terminal</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Sign in</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Access the TD Venture CRM and Deal Desk workspace.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-gray-500">
                Email
              </label>
              <input
                type="email"
                placeholder="operator@tdventure.vc"
                className="mb-4 w-full rounded-md border border-lime-500/30 bg-black/70 px-3 py-3 text-white placeholder:text-gray-700 outline-none transition focus:border-lime-300 focus:shadow-[0_0_18px_rgba(163,255,18,0.18)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-gray-500">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="mb-5 w-full rounded-md border border-lime-500/30 bg-black/70 px-3 py-3 text-white placeholder:text-gray-700 outline-none transition focus:border-lime-300 focus:shadow-[0_0_18px_rgba(163,255,18,0.18)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-lime-400 py-3 font-semibold text-black transition hover:bg-lime-300 hover:shadow-[0_0_24px_rgba(163,255,18,0.35)] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Enter Deal Desk'}
              </button>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-gray-600">
                <span>CRM.TDVENTURE.VC</span>
                <span className="text-lime-400">SECURE CRM ONLINE</span>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
