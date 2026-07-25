import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BloombergBackground from '@/components/crm/BloombergBackground';
import {
  readDealDeskApiError,
  verifyDealDeskAccess
} from '@/lib/dealDeskAccess';

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
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body,
      });

      if (!res.ok) {
        throw new Error(
          await readDealDeskApiError(
            res,
            'Login failed'
          )
        );
      }

      const data = await res.json();
      const token = String(
        data?.access_token || ''
      ).trim();

      if (!token) {
        throw new Error(
          'Deal Desk login did not return a valid session.'
        );
      }

      localStorage.setItem(
        'tdventure_token',
        token
      );

      try {
        await verifyDealDeskAccess(token);
      } catch (accessError) {
        localStorage.removeItem(
          'tdventure_token'
        );

        throw accessError;
      }

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
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-lime-500/15 to-transparent" />
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyan-500/15 to-transparent" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="mb-6 inline-flex rounded-full border border-lime-400/70 bg-black/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-lime-200 shadow-[0_0_24px_rgba(163,255,18,0.18)]">
              TD Venture CRM
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-[1.04] tracking-tight drop-shadow-[0_0_22px_rgba(163,255,18,0.16)]">
              Startup Capital CRM
              <span className="block text-lime-300 drop-shadow-[0_0_18px_rgba(163,255,18,0.35)]">Deal Desk{" "}
                  <span className="text-[#98A2B3]">
                    Command Center
                  </span></span>
            </h1>

            <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-gray-400 xl:text-lg">
              Manage startup discovery, investor workflows, opportunity movement, internal notes,
              IC readiness and follow-ups from one high-speed operating screen.
            </p>

            <div className="mt-8 grid max-w-3xl grid-cols-3 gap-4">
              {[
                ['CRM', 'Deal Desk'],
                ['AI', 'Confidence'],
                ['OPS', 'Follow-up'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-lime-400/40 bg-black/75 p-4 shadow-[0_0_24px_rgba(163,255,18,0.12)]">
                  <div className="text-xs tracking-[0.35em] text-gray-500">{label}</div>
                  <div className="mt-2 text-xl font-bold text-lime-300">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-xl border border-cyan-400/40 bg-black/75 p-4 shadow-[0_0_24px_rgba(34,211,238,0.10)]">
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
            <div className="mb-4 grid grid-cols-2 gap-3">
              <a
                href="https://conversion.tdventure.vc/"
                target="_blank"
                rel="noreferrer"
                className="motion-safe:animate-[pulse_3s_ease-in-out_infinite] inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-300/70 bg-cyan-400/10 px-3 text-center text-xs font-bold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.24)] transition hover:bg-cyan-300 hover:text-black"
              >
                ← Conversion
              </a>

              <a
                href="https://staging.tdventure.vc/app"
                target="_blank"
                rel="noreferrer"
                className="motion-safe:animate-[pulse_3s_ease-in-out_infinite] inline-flex min-h-11 items-center justify-center rounded-md border border-lime-300/70 bg-lime-400/10 px-3 text-center text-xs font-bold text-lime-200 shadow-[0_0_22px_rgba(163,255,18,0.24)] transition hover:bg-lime-300 hover:text-black"
              >
                Private Marketplace →
              </a>
            </div>

            <div className="mb-5 text-center lg:hidden">
              <div className="text-xs uppercase tracking-[0.35em] text-lime-300">TD Venture CRM</div>
              <h1 className="mt-3 text-3xl font-semibold">Startup Capital CRM</h1>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-lime-400/70 bg-black/90 p-7 shadow-[0_0_65px_rgba(163,255,18,0.24)] backdrop-blur"
            >
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-gray-500">Secure terminal</div>
                <h2 className="mt-2 text-3xl font-bold text-white">Sign in</h2>
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
                className="mb-4 w-full rounded-md border border-lime-400/50 bg-black/80 px-3 py-3 text-white placeholder:text-gray-600 outline-none transition focus:border-lime-200 focus:shadow-[0_0_22px_rgba(163,255,18,0.26)]"
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
                className="mb-5 w-full rounded-md border border-lime-400/50 bg-black/80 px-3 py-3 text-white placeholder:text-gray-600 outline-none transition focus:border-lime-200 focus:shadow-[0_0_22px_rgba(163,255,18,0.26)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-lime-400 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-lime-300 hover:shadow-[0_0_34px_rgba(163,255,18,0.45)] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Enter Deal Desk'}
              </button>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                    New to TD Venture
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    Deal Desk access requires a registered Startup or
                    Investor profile.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <a
                    href="https://staging.tdventure.vc/signup/startup"
                    className="inline-flex min-h-12 items-center justify-center rounded-md border border-lime-400/60 bg-lime-400/10 px-3 text-center text-xs font-bold text-lime-300 transition hover:bg-lime-400 hover:text-black"
                  >
                    Apply as Startup
                  </a>

                  <a
                    href="https://staging.tdventure.vc/signup/investor"
                    className="inline-flex min-h-12 items-center justify-center rounded-md border border-cyan-400/60 bg-cyan-400/10 px-3 text-center text-xs font-bold text-cyan-200 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Apply as Investor
                  </a>
                </div>
              </div>

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
